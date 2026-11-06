# otto-sync

Copia os dados dos conectores de cada workspace para o BigQuery. Roda no Google Cloud como **Cloud Run Job**, disparado a cada 15 minutos pelo **Cloud Scheduler**; o app (tela **Dados**) só grava a configuração no Supabase.

```
Cloud Scheduler (*/15) → Cloud Run Job otto-sync
   → Supabase: claim_due_syncs() reserva as sincronizações na hora (ou pedidas em "Rodar agora")
   → Composio: lê Instagram / Facebook (poucas chamadas: posts já vêm com as métricas)
   → BigQuery: dataset do workspace, carga em lote (grátis), sem duplicar
   → Supabase: histórico (data_sync_runs) e próximo horário
```

## Tabelas (dataset `otto_<workspace>`)

| Tabela | Como grava |
|---|---|
| `instagram_posts`, `facebook_posts` | atualiza ou adiciona pelo `post_id` (MERGE) |
| `instagram_post_metricas` | foto diária das métricas dos posts dos últimos 30 dias (a primeira carga leva todos) |
| `instagram_conta_diaria`, `facebook_pagina_diaria` | números do dia anterior (a primeira carga leva 7 dias) |

As tabelas diárias são particionadas por `data` e cada execução substitui o próprio dia: rodar de novo nunca duplica. Toda linha tem `_workspace`, `_conexao`, `_carregado_em` e `_origem` (a resposta original, em JSON).

## Testar sem BigQuery

```bash
SUPABASE_URL=… SUPABASE_SECRET_KEY=… COMPOSIO_API_KEY=… npm run dry-run -- <workspace_id> instagram ./saida
```

Lê como o job e grava um `.ndjson` por tabela em `./saida`, sem tocar no banco.

## Colocar no ar

```bash
PROJECT=meu-projeto REGION=us-central1 ./deploy.sh
```

Depois, em Secret Manager, preencha `otto-supabase-secret` (chave secreta do Supabase) e `otto-composio-key` (chave do Composio). O job usa a conta de serviço `otto-sync`, com permissão de BigQuery só neste projeto.
