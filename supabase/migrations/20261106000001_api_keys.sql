-- OttoSocial: chaves de API para agentes (Claude, ChatGPT, n8n, agentes próprios).
--   * Cada chave é de uma pessoa e vale no workspace em que foi criada.
--   * Só a impressão (SHA-256) da chave fica aqui; a chave inteira aparece uma vez, na hora de criar.
--   * O servidor cria, confere e revoga (chave secreta do Supabase). A pessoa lê as próprias chaves,
--     sem a impressão.

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces (id) on delete cascade,
  user_id text not null,
  name text not null,
  -- Começo da chave ("otto_sk_a1b2"), para reconhecer na lista.
  prefix text not null,
  key_hash text not null unique,
  -- 'ler' (consultar), 'usar' (executar ações nos serviços conectados), 'conectar' (conectar e desconectar).
  scopes text[] not null default '{ler}' check (scopes <@ array['ler', 'usar', 'conectar']::text[] and cardinality(scopes) > 0),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index api_keys_owner on public.api_keys (workspace_id, user_id);

alter table public.api_keys enable row level security;
create policy "api_keys: own, in the active workspace" on public.api_keys for select
  using (user_id = private.uid() and private.is_member(workspace_id));
-- The browser never reads the hash: only these columns are readable.
revoke select on public.api_keys from anon, authenticated;
grant select (id, workspace_id, user_id, name, prefix, scopes, created_at, last_used_at, revoked_at) on public.api_keys to authenticated;

-- Which key did it, when an agent connects a service or runs an action.
alter table public.connectors add column api_key_id uuid references public.api_keys (id) on delete set null;
alter table public.connector_activity add column api_key_id uuid references public.api_keys (id) on delete set null;
