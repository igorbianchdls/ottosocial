-- OttoSocial: initial schema.
-- Everything belongs to a workspace; row level security lets a user see only the workspaces they are a member of.
-- Run once in the Supabase SQL Editor (or with `supabase db push`).

create extension if not exists pgcrypto;

-- ---------- types ----------
create type public.member_role as enum ('owner', 'admin', 'membro');
create type public.file_kind as enum ('video', 'image', 'audio', 'text');
create type public.network as enum ('instagram', 'tiktok', 'linkedin', 'youtube');
create type public.account_status as enum ('conectada', 'reconectar', 'desconectada');
create type public.post_format as enum ('reel', 'story', 'feed');
create type public.post_status as enum ('rascunho', 'agendado', 'publicado', 'erro');
create type public.notification_kind as enum ('publicado', 'erro', 'comentario', 'agendado', 'armazenamento', 'conta', 'plugin', 'arquivos');
create type public.tool_mode as enum ('livre', 'confirmar', 'bloqueado');

-- ---------- helpers ----------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- people and workspaces ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  role text not null default '',
  color text not null default '#3b82f6',
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  business text,
  team_size text,
  timezone text not null default 'America/Sao_Paulo',
  language text not null default 'pt-BR',
  storage_limit bigint not null default 5368709120, -- 5 GB
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'membro',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on public.workspace_members (user_id);

-- Membership checks used by every policy. security definer avoids recursion through workspace_members' own policies.
create or replace function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = ws and user_id = auth.uid())
$$;
create or replace function public.is_admin(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = ws and user_id = auth.uid() and role in ('owner', 'admin'))
$$;

-- New user → profile with the name from sign-up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- New workspace → its creator becomes the owner.
create or replace function public.handle_new_workspace() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role) values (new.id, new.created_by, 'owner');
  return new;
end $$;
create trigger on_workspace_created after insert on public.workspaces for each row execute function public.handle_new_workspace();

-- ---------- spaces, folders, files ----------
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.spaces (workspace_id);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  parent_id uuid references public.folders (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  tags text[] not null default '{}',
  trashed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);
create index on public.folders (space_id, parent_id);
create index on public.folders (workspace_id) where trashed_at is not null;

create table public.files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete cascade, -- null: root of the space
  name text not null check (char_length(name) between 1 and 255),
  kind public.file_kind not null,
  mime text not null default '',
  size bigint not null default 0,
  duration numeric,                  -- seconds, for video and audio
  width int not null default 0,
  height int not null default 0,
  storage_path text not null,        -- object path in the "media" bucket: <workspace_id>/<file_id>/<name>
  proxy_path text,                   -- light copy for previews and the editor
  thumb_path text,
  trashed_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.files (space_id, folder_id);
create index on public.files (workspace_id, updated_at desc);

-- Favorites and recents are per person.
create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  item_type text not null check (item_type in ('folder', 'file')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);
create table public.recents (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  item_type text not null check (item_type in ('folder', 'file')),
  item_id uuid not null,
  opened_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

-- ---------- social accounts and posts ----------
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  network public.network not null,
  handle text not null,
  name text not null default '',
  status public.account_status not null default 'desconectada',
  external_id text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, network, handle)
);
-- OAuth tokens: no policies, so only the server (service role) can read them.
create table public.social_account_tokens (
  account_id uuid primary key references public.social_accounts (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  caption text not null default '',
  format public.post_format not null default 'reel',
  status public.post_status not null default 'rascunho',
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'agendado' or scheduled_at is not null)
);
create index on public.posts (workspace_id, scheduled_at);

create table public.post_files (
  post_id uuid not null references public.posts (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete restrict,
  position int not null default 0,
  primary key (post_id, file_id)
);
-- One row per network the post goes to: link, metrics and errors live here.
create table public.post_accounts (
  post_id uuid not null references public.posts (id) on delete cascade,
  account_id uuid not null references public.social_accounts (id) on delete cascade,
  status public.post_status not null default 'agendado',
  external_id text,
  url text,
  metrics jsonb not null default '{}',
  error text,
  published_at timestamptz,
  primary key (post_id, account_id)
);

-- ---------- editor ----------
create table public.editor_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null default 'Sem título',
  format text not null default '9:16' check (format in ('9:16', '1:1', '16:9')),
  data jsonb not null default '{}',  -- tracks, clips, markers… (the editor's Project, minus id and name)
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.editor_projects (workspace_id, updated_at desc);

create table public.editor_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.editor_projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  label text not null,
  data jsonb not null,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index on public.editor_versions (project_id, created_at desc);

-- ---------- notifications, settings, plugin ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade, -- null: everyone in the workspace
  kind public.notification_kind not null,
  title text not null,
  text text not null default '',
  href text,
  action text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (workspace_id, created_at desc);

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}', -- appearance, notification preferences, posting defaults
  updated_at timestamptz not null default now()
);

create table public.plugin_tool_modes (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  tool_id text not null,
  mode public.tool_mode not null,
  primary key (workspace_id, tool_id)
);
create table public.plugin_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  assistant text not null check (assistant in ('chatgpt', 'claude')),
  tool_id text not null,
  text text not null,
  status text not null check (status in ('feito', 'aguardando', 'recusado')),
  created_at timestamptz not null default now()
);

-- ---------- updated_at ----------
create trigger touch before update on public.spaces for each row execute function public.touch_updated_at();
create trigger touch before update on public.folders for each row execute function public.touch_updated_at();
create trigger touch before update on public.files for each row execute function public.touch_updated_at();
create trigger touch before update on public.posts for each row execute function public.touch_updated_at();
create trigger touch before update on public.editor_projects for each row execute function public.touch_updated_at();
create trigger touch before update on public.user_settings for each row execute function public.touch_updated_at();

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.spaces enable row level security;
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.favorites enable row level security;
alter table public.recents enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_account_tokens enable row level security;
alter table public.posts enable row level security;
alter table public.post_files enable row level security;
alter table public.post_accounts enable row level security;
alter table public.editor_projects enable row level security;
alter table public.editor_versions enable row level security;
alter table public.notifications enable row level security;
alter table public.user_settings enable row level security;
alter table public.plugin_tool_modes enable row level security;
alter table public.plugin_activity enable row level security;

-- Profiles: yourself, and the people who share a workspace with you.
create policy "profiles: read own and teammates" on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.workspace_members a join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy "profiles: update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Workspaces: members read; anyone signed in creates (and becomes owner); admins edit; owner deletes.
create policy "workspaces: members read" on public.workspaces for select using (public.is_member(id) or created_by = auth.uid());
create policy "workspaces: create" on public.workspaces for insert with check (auth.uid() is not null and created_by = auth.uid());
create policy "workspaces: admins update" on public.workspaces for update using (public.is_admin(id));
create policy "workspaces: owner deletes" on public.workspaces for delete using (exists (select 1 from public.workspace_members m where m.workspace_id = id and m.user_id = auth.uid() and m.role = 'owner'));

create policy "members: read" on public.workspace_members for select using (public.is_member(workspace_id));
create policy "members: admins manage" on public.workspace_members for all using (public.is_admin(workspace_id)) with check (public.is_admin(workspace_id));
create policy "members: leave" on public.workspace_members for delete using (user_id = auth.uid() and role <> 'owner');

-- Workspace content: any member reads and writes.
do $$
declare t text;
begin
  foreach t in array array['spaces', 'folders', 'files', 'social_accounts', 'posts', 'editor_projects', 'editor_versions', 'plugin_tool_modes', 'plugin_activity'] loop
    execute format('create policy "%1$s: members read" on public.%1$I for select using (public.is_member(workspace_id))', t);
    execute format('create policy "%1$s: members insert" on public.%1$I for insert with check (public.is_member(workspace_id))', t);
    execute format('create policy "%1$s: members update" on public.%1$I for update using (public.is_member(workspace_id)) with check (public.is_member(workspace_id))', t);
    execute format('create policy "%1$s: members delete" on public.%1$I for delete using (public.is_member(workspace_id))', t);
  end loop;
end $$;

-- Children of posts follow the post's workspace.
create policy "post_files: members" on public.post_files for all
  using (exists (select 1 from public.posts p where p.id = post_id and public.is_member(p.workspace_id)))
  with check (exists (select 1 from public.posts p where p.id = post_id and public.is_member(p.workspace_id)));
create policy "post_accounts: members" on public.post_accounts for all
  using (exists (select 1 from public.posts p where p.id = post_id and public.is_member(p.workspace_id)))
  with check (exists (select 1 from public.posts p where p.id = post_id and public.is_member(p.workspace_id)));

-- Per-person rows.
create policy "favorites: own" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member(workspace_id));
create policy "recents: own" on public.recents for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member(workspace_id));
create policy "settings: own" on public.user_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Notifications: the workspace's shared ones and your own; you can mark them read or delete them.
create policy "notifications: read" on public.notifications for select using (public.is_member(workspace_id) and (user_id is null or user_id = auth.uid()));
create policy "notifications: update" on public.notifications for update using (public.is_member(workspace_id) and (user_id is null or user_id = auth.uid()));
create policy "notifications: delete" on public.notifications for delete using (public.is_member(workspace_id) and (user_id is null or user_id = auth.uid()));
create policy "notifications: insert" on public.notifications for insert with check (public.is_member(workspace_id));

-- social_account_tokens: no policies on purpose (server only).

-- ---------- storage: private "media" bucket, one folder per workspace ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 5368709120)
on conflict (id) do nothing;

create policy "media: members read" on storage.objects for select
  using (bucket_id = 'media' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "media: members upload" on storage.objects for insert
  with check (bucket_id = 'media' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "media: members update" on storage.objects for update
  using (bucket_id = 'media' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "media: members delete" on storage.objects for delete
  using (bucket_id = 'media' and public.is_member(((storage.foldername(name))[1])::uuid));
