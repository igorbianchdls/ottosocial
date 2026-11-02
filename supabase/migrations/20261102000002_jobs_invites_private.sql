-- OttoSocial, second migration:
--   * "private" schema for secrets and internal functions (not exposed by the Data API)
--   * upload processing queue (file_jobs) and scheduled publishing queue (publish_jobs)
--   * OAuth state for connecting Instagram/TikTok accounts
--   * workspace invites
--   * tags on files

-- ---------- private schema ----------
create schema if not exists private;
revoke all on schema private from public;
-- Policies call private.is_member/is_admin as the signed-in role, so roles need usage
-- on the schema. The schema is not in the API's exposed schemas, so nothing in it is reachable over HTTP.
grant usage on schema private to anon, authenticated, service_role;
-- Supabase Auth fires private.handle_new_user on sign-up.
do $$ begin
  if exists (select from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema private to supabase_auth_admin;
  end if;
end $$;

alter function public.is_member(uuid) set schema private;
alter function public.is_admin(uuid) set schema private;
alter function public.handle_new_user() set schema private;
alter function public.handle_new_workspace() set schema private;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.handle_new_workspace() from public, anon, authenticated;

-- Account tokens move out of the API's reach entirely.
alter table public.social_account_tokens set schema private;
revoke all on private.social_account_tokens from public, anon, authenticated;
grant all on private.social_account_tokens to service_role;

-- OAuth "state" while someone connects an account (lives 10 minutes).
create table private.oauth_states (
  state text primary key default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  network public.network not null,
  code_verifier text,
  redirect_to text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
alter table private.oauth_states enable row level security;
revoke all on private.oauth_states from public, anon, authenticated;
grant all on private.oauth_states to service_role;

-- Server-only doors into the private tables (the secret key can only call what is exposed).
create function public.oauth_state_create(ws uuid, uid uuid, net public.network, verifier text default null, redirect text default null)
returns text language sql security definer set search_path = public, private as $$
  delete from private.oauth_states where expires_at < now();
  insert into private.oauth_states (workspace_id, user_id, network, code_verifier, redirect_to)
  values (ws, uid, net, verifier, redirect) returning state;
$$;
create function public.oauth_state_consume(st text)
returns table (workspace_id uuid, user_id uuid, network public.network, code_verifier text, redirect_to text)
language sql security definer set search_path = public, private as $$
  delete from private.oauth_states s where s.state = st and s.expires_at >= now()
  returning s.workspace_id, s.user_id, s.network, s.code_verifier, s.redirect_to;
$$;
create function public.account_token_save(account uuid, access text, refresh text default null, expires timestamptz default null)
returns void language sql security definer set search_path = public, private as $$
  insert into private.social_account_tokens (account_id, access_token, refresh_token, expires_at, updated_at)
  values (account, access, refresh, expires, now())
  on conflict (account_id) do update set access_token = excluded.access_token,
    refresh_token = coalesce(excluded.refresh_token, private.social_account_tokens.refresh_token),
    expires_at = excluded.expires_at, updated_at = now();
$$;
create function public.account_token_get(account uuid)
returns table (access_token text, refresh_token text, expires_at timestamptz)
language sql stable security definer set search_path = public, private as $$
  select t.access_token, t.refresh_token, t.expires_at from private.social_account_tokens t where t.account_id = account;
$$;
revoke all on function public.oauth_state_create(uuid, uuid, public.network, text, text) from public, anon, authenticated;
revoke all on function public.oauth_state_consume(text) from public, anon, authenticated;
revoke all on function public.account_token_save(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.account_token_get(uuid) from public, anon, authenticated;
grant execute on function public.oauth_state_create(uuid, uuid, public.network, text, text) to service_role;
grant execute on function public.oauth_state_consume(text) to service_role;
grant execute on function public.account_token_save(uuid, text, text, timestamptz) to service_role;
grant execute on function public.account_token_get(uuid) to service_role;

-- ---------- tags on files ----------
alter table public.files add column tags text[] not null default '{}';
create index files_tags_idx on public.files using gin (tags);
create index folders_tags_idx on public.folders using gin (tags);

-- ---------- job queues ----------
create type public.job_status as enum ('pendente', 'executando', 'concluido', 'falhou', 'cancelado');
create type public.file_job_kind as enum ('miniatura', 'proxy');

-- Upload processing: the server makes the thumbnail and the light copy for the editor.
create table public.file_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  kind public.file_job_kind not null,
  status public.job_status not null default 'pendente',
  attempts int not null default 0,
  max_attempts int not null default 3,
  run_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (file_id, kind)
);
create index file_jobs_due_idx on public.file_jobs (run_at) where status = 'pendente';

-- Scheduled publishing: one job per post and network, created from the post itself.
create table public.publish_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  account_id uuid not null references public.social_accounts (id) on delete cascade,
  status public.job_status not null default 'pendente',
  attempts int not null default 0,
  max_attempts int not null default 3,
  run_at timestamptz not null,
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index publish_jobs_open_idx on public.publish_jobs (post_id, account_id) where status in ('pendente', 'executando');
create index publish_jobs_due_idx on public.publish_jobs (run_at) where status = 'pendente';

create trigger touch before update on public.file_jobs for each row execute function public.touch_updated_at();
create trigger touch before update on public.publish_jobs for each row execute function public.touch_updated_at();

-- Members can watch their jobs; only the server (secret key, bypasses RLS) changes them.
alter table public.file_jobs enable row level security;
alter table public.publish_jobs enable row level security;
create policy "file_jobs: members read" on public.file_jobs for select using (private.is_member(workspace_id));
create policy "publish_jobs: members read" on public.publish_jobs for select using (private.is_member(workspace_id));

-- A new video gets a thumbnail and a proxy; a new image gets a thumbnail.
create function private.enqueue_file_jobs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind in ('video', 'image') then
    insert into public.file_jobs (workspace_id, file_id, kind) values (new.workspace_id, new.id, 'miniatura') on conflict do nothing;
  end if;
  if new.kind = 'video' then
    insert into public.file_jobs (workspace_id, file_id, kind) values (new.workspace_id, new.id, 'proxy') on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function private.enqueue_file_jobs() from public, anon, authenticated;
create trigger enqueue_file_jobs after insert on public.files for each row execute function private.enqueue_file_jobs();

-- Keeps publish_jobs in step with the post: scheduling, rescheduling, unscheduling, adding or removing a network.
-- Pending jobs are rebuilt; a job already running or done is never duplicated.
create function private.sync_publish_jobs(p uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.publish_jobs where post_id = p and status = 'pendente';
  insert into public.publish_jobs (workspace_id, post_id, account_id, run_at)
  select po.workspace_id, po.id, pa.account_id, po.scheduled_at
  from public.posts po join public.post_accounts pa on pa.post_id = po.id
  where po.id = p and po.status = 'agendado' and po.scheduled_at is not null and pa.status = 'agendado'
    and not exists (select 1 from public.publish_jobs j where j.post_id = po.id and j.account_id = pa.account_id and j.status in ('executando', 'concluido'));
end $$;
create function private.on_post_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.sync_publish_jobs(new.id);
  return null;
end $$;
create function private.on_post_account_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.sync_publish_jobs(coalesce(new.post_id, old.post_id));
  return null;
end $$;
revoke all on function private.sync_publish_jobs(uuid) from public, anon, authenticated;
revoke all on function private.on_post_change() from public, anon, authenticated;
revoke all on function private.on_post_account_change() from public, anon, authenticated;
create trigger sync_publish_jobs after insert or update of status, scheduled_at on public.posts
  for each row execute function private.on_post_change();
create trigger sync_publish_jobs after insert or delete or update of status on public.post_accounts
  for each row execute function private.on_post_account_change();

-- Workers take due jobs without two of them taking the same one; a job stuck for 15 minutes is taken again.
create function public.claim_file_jobs(max_jobs int default 5) returns setof public.file_jobs
language sql security definer set search_path = public as $$
  update public.file_jobs j set status = 'executando', attempts = j.attempts + 1, locked_at = now()
  where j.id in (
    select id from public.file_jobs
    where (status = 'pendente' and run_at <= now()) or (status = 'executando' and locked_at < now() - interval '15 minutes')
    order by run_at limit max_jobs for update skip locked)
  returning j.*;
$$;
create function public.claim_publish_jobs(max_jobs int default 10) returns setof public.publish_jobs
language sql security definer set search_path = public as $$
  update public.publish_jobs j set status = 'executando', attempts = j.attempts + 1, locked_at = now()
  where j.id in (
    select id from public.publish_jobs
    where (status = 'pendente' and run_at <= now()) or (status = 'executando' and locked_at < now() - interval '15 minutes')
    order by run_at limit max_jobs for update skip locked)
  returning j.*;
$$;
revoke all on function public.claim_file_jobs(int) from public, anon, authenticated;
revoke all on function public.claim_publish_jobs(int) from public, anon, authenticated;
grant execute on function public.claim_file_jobs(int) to service_role;
grant execute on function public.claim_publish_jobs(int) to service_role;

-- ---------- workspace invites ----------
create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (email = lower(email) and position('@' in email) > 1),
  role public.member_role not null default 'membro' check (role <> 'owner'),
  token text not null unique default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  invited_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null
);
create unique index workspace_invites_open_idx on public.workspace_invites (workspace_id, email) where accepted_at is null;
alter table public.workspace_invites enable row level security;
-- Admins see and manage their workspace's invites; the invited person sees invites to their own e-mail.
create policy "invites: admins read" on public.workspace_invites for select
  using (private.is_admin(workspace_id) or email = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "invites: admins create" on public.workspace_invites for insert
  with check (private.is_admin(workspace_id) and invited_by = auth.uid() and accepted_at is null);
create policy "invites: admins delete" on public.workspace_invites for delete using (private.is_admin(workspace_id));

-- Accepting checks the link, the expiry and that the invite is for the signed-in e-mail.
create function public.accept_invite(invite_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.workspace_invites;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into inv from public.workspace_invites where token = invite_token for update;
  if inv.id is null or inv.accepted_at is not null or inv.expires_at < now() then
    raise exception 'invite not found or expired';
  end if;
  if inv.email <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'invite is for another e-mail';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (inv.workspace_id, auth.uid(), inv.role)
  on conflict do nothing;
  update public.workspace_invites set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return inv.workspace_id;
end $$;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;
