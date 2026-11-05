-- OttoSocial: travas da API dos agentes e faxina.
--   * Nova permissão de chave 'agir': ações que enviam, publicam, alteram ou apagam nos serviços conectados.
--     'usar' passa a liberar só as ações de leitura.
--   * Limite de uso por chave (por minuto e por dia), contado aqui.
--   * Sai o que era do login direto nas redes (o Composio cuida disso agora).

-- ---------- permissões ----------
alter table public.api_keys drop constraint if exists api_keys_scopes_check;
alter table public.api_keys add constraint api_keys_scopes_check
  check (scopes <@ array['ler', 'usar', 'agir', 'conectar']::text[] and cardinality(scopes) > 0);

-- ---------- limite de uso ----------
create table private.api_usage (
  key_id uuid not null references public.api_keys (id) on delete cascade,
  bucket text not null, -- 'm:2026-11-07T10:05' (minuto) ou 'd:2026-11-07' (dia), em UTC
  hits integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (key_id, bucket)
);

-- Counts one call of a key in the current minute and day (and, for an action, in the day's actions).
-- Answers whether it is still within the limits. Old counters are swept now and then.
create or replace function public.api_hit(key uuid, per_minute integer, per_day integer, action boolean default false, actions_per_day integer default 0)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  now_utc timestamp := now() at time zone 'utc';
  m integer; d integer; a integer := 0;
begin
  insert into private.api_usage (key_id, bucket, hits) values (key, 'm:' || to_char(now_utc, 'YYYY-MM-DD"T"HH24:MI'), 1)
    on conflict (key_id, bucket) do update set hits = private.api_usage.hits + 1 returning hits into m;
  insert into private.api_usage (key_id, bucket, hits) values (key, 'd:' || to_char(now_utc, 'YYYY-MM-DD'), 1)
    on conflict (key_id, bucket) do update set hits = private.api_usage.hits + 1 returning hits into d;
  if action then
    insert into private.api_usage (key_id, bucket, hits) values (key, 'a:' || to_char(now_utc, 'YYYY-MM-DD'), 1)
      on conflict (key_id, bucket) do update set hits = private.api_usage.hits + 1 returning hits into a;
  end if;
  if random() < 0.01 then delete from private.api_usage where created_at < now() - interval '2 days'; end if;
  return m <= per_minute and d <= per_day and (not action or a <= actions_per_day);
end $$;
revoke all on function public.api_hit(uuid, integer, integer, boolean, integer) from public, anon, authenticated;
grant execute on function public.api_hit(uuid, integer, integer, boolean, integer) to service_role;

-- ---------- faxina: login direto nas redes ----------
drop function if exists public.oauth_state_create(text, text, public.network, text, text);
drop function if exists public.oauth_state_consume(text);
drop table if exists private.oauth_states;
drop table if exists public.social_account_tokens;
