-- OttoSocial: Clerk replaces Supabase Auth.
--   * People are Clerk users ("user_…") and workspaces are Clerk Organizations ("org_…"), so those ids become text.
--   * The app sends the Clerk session token; Supabase accepts it (third-party auth) and auth.jwt() carries
--     the user in "sub" and the active organization in "o" ({ id, rol }) — or org_id/org_role in older tokens.
--   * Access is granted to the active organization only: switching workspace is switching organization in Clerk.
--   * Clerk owns members, invites and roles; workspace_members is just the roster the app keeps for names.
-- Run after the previous migrations, on an empty database (there are no Supabase Auth users to carry over).

-- ---------- who is asking ----------
create or replace function private.uid() returns text language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')
$$;
create or replace function private.org() returns text language sql stable as $$
  select coalesce(nullif(auth.jwt() -> 'o' ->> 'id', ''), nullif(auth.jwt() ->> 'org_id', ''))
$$;
-- 'admin' or 'member' (Clerk sends "admin" in "o.rol", or "org:admin" in org_role).
create or replace function private.org_role() returns text language sql stable as $$
  select regexp_replace(coalesce(auth.jwt() -> 'o' ->> 'rol', auth.jwt() ->> 'org_role', ''), '^org:', '')
$$;
grant execute on function private.uid(), private.org(), private.org_role() to anon, authenticated, service_role;

-- ---------- out with the Supabase Auth pieces ----------
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public' or (schemaname = 'storage' and policyname like 'media:%') loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Sign-up no longer goes through auth.users. Keep the trigger harmless if it can't be dropped from here.
create or replace function private.handle_new_user() returns trigger language plpgsql as $$ begin return new; end $$;
do $$ begin
  drop trigger if exists on_auth_user_created on auth.users;
exception when insufficient_privilege then null;
end $$;
drop trigger if exists on_workspace_created on public.workspaces;
drop function if exists private.handle_new_workspace();
drop function if exists public.accept_invite(text);
drop table if exists public.workspace_invites;
drop function if exists public.oauth_state_create(uuid, uuid, public.network, text, text);

-- Foreign keys to auth.users go away; the ones to workspaces come back after the type change.
do $$
declare r record;
begin
  for r in select c.conrelid::regclass as tbl, c.conname from pg_constraint c
           where c.contype = 'f' and c.connamespace in ('public'::regnamespace, 'private'::regnamespace)
             and c.confrelid in ('auth.users'::regclass, 'public.workspaces'::regclass) loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

-- ---------- ids become text ----------
alter table public.workspaces alter column id drop default, alter column id type text;
do $$
declare r record;
begin
  for r in select table_schema, table_name from information_schema.columns
           where column_name = 'workspace_id' and table_schema in ('public', 'private') and table_name not like 'pg_%'
             and table_name in (select table_name from information_schema.tables where table_type = 'BASE TABLE' and table_schema in ('public', 'private')) loop
    execute format('alter table %I.%I alter column workspace_id type text', r.table_schema, r.table_name);
    execute format('alter table %I.%I add foreign key (workspace_id) references public.workspaces (id) on delete cascade', r.table_schema, r.table_name);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select * from (values
      ('public', 'profiles', 'id'), ('public', 'workspace_members', 'user_id'), ('public', 'workspaces', 'created_by'),
      ('public', 'files', 'created_by'), ('public', 'posts', 'created_by'), ('public', 'editor_projects', 'created_by'),
      ('public', 'editor_versions', 'created_by'), ('public', 'favorites', 'user_id'), ('public', 'recents', 'user_id'),
      ('public', 'notifications', 'user_id'), ('public', 'user_settings', 'user_id'), ('private', 'oauth_states', 'user_id')
    ) as t(s, t, c) loop
    execute format('alter table %I.%I alter column %I drop default', r.s, r.t, r.c);
    execute format('alter table %I.%I alter column %I type text', r.s, r.t, r.c);
    -- notifications.user_id stays null for "everyone in the workspace".
    if not (r.t = 'notifications') then
      execute format('alter table %I.%I alter column %I set default private.uid()', r.s, r.t, r.c);
    end if;
  end loop;
end $$;

-- ---------- membership ----------
drop function if exists private.is_member(uuid);
drop function if exists private.is_admin(uuid);
create function private.is_member(ws text) returns boolean language sql stable as $$
  select ws is not null and ws = private.org()
$$;
create function private.is_admin(ws text) returns boolean language sql stable as $$
  select private.is_member(ws) and private.org_role() = 'admin'
$$;
grant execute on function private.is_member(text), private.is_admin(text) to anon, authenticated, service_role;

-- ---------- policies ----------
-- Profiles: yourself, and the people the app has seen in your active workspace.
create policy "profiles: read own and teammates" on public.profiles for select using (
  id = private.uid() or exists (select 1 from public.workspace_members m where m.user_id = profiles.id and m.workspace_id = private.org()));
create policy "profiles: create own" on public.profiles for insert with check (id = private.uid());
create policy "profiles: update own" on public.profiles for update using (id = private.uid()) with check (id = private.uid());

-- Workspaces mirror the Clerk organization: any member may create the row, admins edit it, Clerk deletes it.
create policy "workspaces: members read" on public.workspaces for select using (private.is_member(id));
create policy "workspaces: members create" on public.workspaces for insert with check (private.is_member(id));
create policy "workspaces: admins update" on public.workspaces for update using (private.is_admin(id)) with check (private.is_admin(id));

-- Roster: each person writes their own row, with the role their token proves.
create policy "members: read" on public.workspace_members for select using (private.is_member(workspace_id));
create policy "members: write own" on public.workspace_members for insert
  with check (user_id = private.uid() and private.is_member(workspace_id) and (role = 'membro' or (role = 'admin' and private.org_role() = 'admin')));
create policy "members: update own" on public.workspace_members for update using (user_id = private.uid() and private.is_member(workspace_id))
  with check (user_id = private.uid() and private.is_member(workspace_id) and (role = 'membro' or (role = 'admin' and private.org_role() = 'admin')));
create policy "members: admins remove" on public.workspace_members for delete using (private.is_admin(workspace_id));

-- Workspace content: any member of the active workspace reads and writes.
do $$
declare t text;
begin
  foreach t in array array['spaces', 'folders', 'files', 'social_accounts', 'posts', 'editor_projects', 'editor_versions', 'plugin_tool_modes', 'plugin_activity'] loop
    execute format('create policy "%1$s: members read" on public.%1$I for select using (private.is_member(workspace_id))', t);
    execute format('create policy "%1$s: members insert" on public.%1$I for insert with check (private.is_member(workspace_id))', t);
    execute format('create policy "%1$s: members update" on public.%1$I for update using (private.is_member(workspace_id)) with check (private.is_member(workspace_id))', t);
    execute format('create policy "%1$s: members delete" on public.%1$I for delete using (private.is_member(workspace_id))', t);
  end loop;
end $$;

create policy "post_files: members" on public.post_files for all
  using (exists (select 1 from public.posts p where p.id = post_id and private.is_member(p.workspace_id)))
  with check (exists (select 1 from public.posts p where p.id = post_id and private.is_member(p.workspace_id)));
create policy "post_accounts: members" on public.post_accounts for all
  using (exists (select 1 from public.posts p where p.id = post_id and private.is_member(p.workspace_id)))
  with check (exists (select 1 from public.posts p where p.id = post_id and private.is_member(p.workspace_id)));

create policy "favorites: own" on public.favorites for all using (user_id = private.uid()) with check (user_id = private.uid() and private.is_member(workspace_id));
create policy "recents: own" on public.recents for all using (user_id = private.uid()) with check (user_id = private.uid() and private.is_member(workspace_id));
create policy "settings: own" on public.user_settings for all using (user_id = private.uid()) with check (user_id = private.uid());

create policy "notifications: read" on public.notifications for select using (private.is_member(workspace_id) and (user_id is null or user_id = private.uid()));
create policy "notifications: update" on public.notifications for update using (private.is_member(workspace_id) and (user_id is null or user_id = private.uid()));
create policy "notifications: delete" on public.notifications for delete using (private.is_member(workspace_id) and (user_id is null or user_id = private.uid()));
create policy "notifications: insert" on public.notifications for insert with check (private.is_member(workspace_id));

create policy "file_jobs: members read" on public.file_jobs for select using (private.is_member(workspace_id));
create policy "publish_jobs: members read" on public.publish_jobs for select using (private.is_member(workspace_id));

-- Storage: one folder per workspace, "<org id>/…".
create policy "media: members read" on storage.objects for select using (bucket_id = 'media' and private.is_member((storage.foldername(name))[1]));
create policy "media: members upload" on storage.objects for insert with check (bucket_id = 'media' and private.is_member((storage.foldername(name))[1]));
create policy "media: members update" on storage.objects for update using (bucket_id = 'media' and private.is_member((storage.foldername(name))[1]));
create policy "media: members delete" on storage.objects for delete using (bucket_id = 'media' and private.is_member((storage.foldername(name))[1]));

-- ---------- server-only doors with the new id types ----------
create function public.oauth_state_create(ws text, uid text, net public.network, verifier text default null, redirect text default null)
returns text language sql security definer set search_path = public, private as $$
  delete from private.oauth_states where expires_at < now();
  insert into private.oauth_states (workspace_id, user_id, network, code_verifier, redirect_to)
  values (ws, uid, net, verifier, redirect) returning state;
$$;
revoke all on function public.oauth_state_create(text, text, public.network, text, text) from public, anon, authenticated;
grant execute on function public.oauth_state_create(text, text, public.network, text, text) to service_role;

drop function if exists public.oauth_state_consume(text);
create function public.oauth_state_consume(st text)
returns table (workspace_id text, user_id text, network public.network, code_verifier text, redirect_to text)
language sql security definer set search_path = public, private as $$
  delete from private.oauth_states s where s.state = st and s.expires_at >= now()
  returning s.workspace_id, s.user_id, s.network, s.code_verifier, s.redirect_to;
$$;
revoke all on function public.oauth_state_consume(text) from public, anon, authenticated;
grant execute on function public.oauth_state_consume(text) to service_role;
