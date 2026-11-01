# OttoSocial

Drive de mídias com publicação em redes sociais.

## Fase 1 (esta versão)

Interface completa com dados de exemplo, sem backend:

- `/` Início: armazenamento, próximos posts, arquivos recentes e publicados.
- `/projetos/[id]` Drive do projeto: pastas em cards, busca, painel Info (espaço por tipo, propriedades e tags).
- `/pastas/[id]` Arquivos da pasta: grade ou lista, seleção múltipla e "Postar" com os arquivos escolhidos.
- `/postar` Composer: mídia do drive, legenda, contas, formato (Reel, Story, Feed), publicar agora ou agendar, prévia no celular.
- `/posts` Agendados, publicados e rascunhos em lista ou calendário, com métricas.
- `/contas`, `/configuracoes`, `/notificacoes`, `/login`.

Os posts criados ficam no `localStorage` do navegador. Os dados de exemplo estão em `src/lib/data.ts`.

## Próximas fases

- Fase 2: login, banco e arquivos no Supabase (Auth, Postgres e Storage).
- Fase 3: publicação de verdade (Postiz ou API do Instagram).

## Desenvolvimento

```bash
pnpm install
pnpm dev
```
