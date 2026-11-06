-- OttoSocial: Dados — sincronizações dos conectores para o BigQuery.
--   * data_destinations: o BigQuery de cada workspace (por padrão o do OttoSocial, um dataset por workspace).
--   * data_syncs: o que copiar, de qual conexão, e quando (uma vez por dia, na hora escolhida, em Brasília).
--   * data_sync_runs: o histórico de cada execução.
-- Quem copia é o job "otto-sync" no Google Cloud (workers/sync), com a chave secreta do Supabase.
-- Os membros do workspace leem; só o servidor grava (as rotas /api/dados conferem que quem pede é admin).

create table public.data_destinations (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces (id) on delete cascade,
  kind text not null default 'bigquery' check (kind in ('bigquery')),
  -- Vazio: o projeto do OttoSocial (configurado no job). Preenchido: o BigQuery do próprio cliente.
  project_id text,
  dataset text not null,
  location text not null default 'US',
  status text not null default 'pendente' check (status in ('pendente', 'ativo', 'erro')),
  error text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, kind)
);

create table public.data_syncs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces (id) on delete cascade,
  destination_id uuid not null references public.data_destinations (id) on delete cascade,
  -- Fontes copiadas pelo job. As do Google (GA4, Google Ads, YouTube) usam a importação nativa do Google
  -- e não passam por aqui.
  source text not null check (source in ('instagram', 'facebook', 'metaads')),
  connection_id uuid references public.connectors (id) on delete set null,
  streams text[] not null check (cardinality(streams) > 0),
  -- Hora do dia (0–23, horário de Brasília) da execução diária.
  hour smallint not null default 3 check (hour between 0 and 23),
  mode text not null default 'incremental' check (mode in ('incremental', 'completo')),
  enabled boolean not null default true,
  -- Até onde já copiou, por tabela (o job guarda e lê).
  state jsonb not null default '{}',
  run_requested_at timestamptz,
  next_run_at timestamptz not null default now(),
  last_run_at timestamptz,
  last_status text check (last_status in ('ok', 'erro')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source, connection_id)
);
create index data_syncs_due on public.data_syncs (next_run_at) where enabled;

create table public.data_sync_runs (
  id uuid primary key default gen_random_uuid(),
  sync_id uuid not null references public.data_syncs (id) on delete cascade,
  workspace_id text not null references public.workspaces (id) on delete cascade,
  status text not null default 'rodando' check (status in ('rodando', 'ok', 'erro')),
  trigger text not null default 'agenda' check (trigger in ('agenda', 'manual')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  -- Linhas gravadas por tabela, ex.: {"instagram_posts": 25, "instagram_post_metricas": 25}.
  rows jsonb not null default '{}',
  calls integer not null default 0,
  error text
);
create index data_sync_runs_sync on public.data_sync_runs (sync_id, started_at desc);
create index data_sync_runs_workspace on public.data_sync_runs (workspace_id, started_at desc);

create trigger touch before update on public.data_destinations for each row execute function public.touch_updated_at();
create trigger touch before update on public.data_syncs for each row execute function public.touch_updated_at();

alter table public.data_destinations enable row level security;
alter table public.data_syncs enable row level security;
alter table public.data_sync_runs enable row level security;
create policy "data_destinations: members read" on public.data_destinations for select using (private.is_member(workspace_id));
create policy "data_syncs: members read" on public.data_syncs for select using (private.is_member(workspace_id));
create policy "data_sync_runs: members read" on public.data_sync_runs for select using (private.is_member(workspace_id));

-- The next daily run: today at that hour in Brasília if still ahead, else tomorrow.
create or replace function private.next_daily_run(h smallint, after timestamptz default now()) returns timestamptz
language sql stable as $$
  select case when t > after then t else t + interval '1 day' end
  from (select (date_trunc('day', after at time zone 'America/Sao_Paulo') + make_interval(hours => h)) at time zone 'America/Sao_Paulo' as t) x
$$;

-- For the job: takes up to max_syncs syncs that are due (or asked to run now) and not already running,
-- opens a run for each and moves their next run to the following day. Two jobs never take the same sync.
create or replace function public.claim_due_syncs(max_syncs integer default 10)
returns table (run_id uuid, sync_id uuid, workspace_id text, source text, connection_id uuid, streams text[], mode text, state jsonb,
  project_id text, dataset text, location text, manual boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  return query
  with due as (
    select s.id, (s.run_requested_at is not null) as manual from public.data_syncs s
    where s.enabled and (s.run_requested_at is not null or s.next_run_at <= now())
      and not exists (select 1 from public.data_sync_runs r where r.sync_id = s.id and r.status = 'rodando' and r.started_at > now() - interval '2 hours')
    order by coalesce(s.run_requested_at, s.next_run_at)
    limit max_syncs
    for update of s skip locked
  ), moved as (
    update public.data_syncs s set next_run_at = private.next_daily_run(s.hour, now() + interval '1 minute'), run_requested_at = null
    from due where s.id = due.id
    returning s.id, s.workspace_id, s.source, s.connection_id, s.streams, s.mode, s.state, s.destination_id, due.manual
  ), runs as (
    insert into public.data_sync_runs (sync_id, workspace_id, trigger)
    select m.id, m.workspace_id, case when m.manual then 'manual' else 'agenda' end from moved m
    returning id, sync_id
  )
  select runs.id, m.id, m.workspace_id, m.source, m.connection_id, m.streams, m.mode, m.state, d.project_id, d.dataset, d.location, m.manual
  from runs join moved m on m.id = runs.sync_id join public.data_destinations d on d.id = m.destination_id;
end $$;
revoke all on function public.claim_due_syncs(integer) from public, anon, authenticated;
grant execute on function public.claim_due_syncs(integer) to service_role;
