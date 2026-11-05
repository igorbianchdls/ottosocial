-- OttoSocial: Conectores (integrações do workspace feitas pelo Composio).
--   * Cada linha é uma conta de um serviço (Instagram, Meta Ads, Google Drive…) ligada ao workspace inteiro.
--   * O login e os tokens ficam no Composio; aqui só a referência (composio_account_id) e o estado.
--   * Só o servidor escreve (rotas /api/conectores, com a chave secreta, depois de conferir que quem pede é admin
--     do workspace no Clerk). Os membros do workspace leem.

create table public.connectors (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces (id) on delete cascade,
  -- Id do conector no catálogo do app (src/features/connectors/catalog.ts), ex.: 'instagram', 'metaads'.
  connector text not null,
  status text not null default 'conectando'
    check (status in ('conectando', 'conectado', 'reconectar', 'erro', 'desconectado')),
  -- Como a conta aparece para as pessoas ("@otto.erp", "Conta de anúncios Otto").
  account_label text not null default '',
  composio_account_id text unique,
  composio_auth_config_id text,
  connected_by text,
  connected_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index connectors_workspace on public.connectors (workspace_id, connector);

-- O que aconteceu com cada conector (conectou, desconectou, expirou, falhou, foi usado).
create table public.connector_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces (id) on delete cascade,
  connection_id uuid references public.connectors (id) on delete set null,
  connector text not null,
  action text not null check (action in ('conectou', 'desconectou', 'reconectar', 'erro', 'usou')),
  detail text not null default '',
  actor text,
  created_at timestamptz not null default now()
);
create index connector_activity_workspace on public.connector_activity (workspace_id, created_at desc);

create trigger touch before update on public.connectors for each row execute function public.touch_updated_at();

alter table public.connectors enable row level security;
alter table public.connector_activity enable row level security;
-- Sem políticas de escrita: só o servidor (chave secreta) grava.
create policy "connectors: members read" on public.connectors for select using (private.is_member(workspace_id));
create policy "connector_activity: members read" on public.connector_activity for select using (private.is_member(workspace_id));
