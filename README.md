# OttoSocial

Spaces de mídias com publicação em redes sociais.

## Fase 1 (esta versão)

Interface completa com dados de exemplo, sem backend:

- `/` Início: armazenamento, próximos posts, arquivos recentes e publicados.
- `/spaces` Todos os spaces em cards, com o armazenamento usado, a divisão por tipo e os arquivos recentes.
- `/spaces/[id]` Um space: pastas em cards, busca, painel Info (espaço por tipo, propriedades e tags).
- `/pastas/[id]` Arquivos da pasta: grade ou lista, seleção múltipla e "Postar" com os arquivos escolhidos.
- `/postar` Composer: mídia dos spaces, legenda, contas, formato (Reel, Story, Feed), publicar agora ou agendar, prévia no celular.
- `/posts` Agendados, publicados e rascunhos em lista ou calendário, com métricas.
- `/editor` Projetos de vídeo. `/editor/[id]` Editor com linha do tempo (faixas de texto, legenda, forma, imagem, vídeo e áudio; mover, cortar pontas, dividir, ímã, zoom, desfazer), prévia em Remotion com seleção e arraste direto no vídeo, painel de propriedades e um chat de IA de demonstração. Recursos: keyframes (mover, escala, rotação, opacidade), transições de entrada e saída (fade, deslizar, zoom, desfoque), velocidade (0,5x a 3x), filtros (P&B, vívido, quente, vintage, escuro, brilho, contraste, saturação), fontes, seleção múltipla com arraste em grupo, copiar/recortar/colar e excluir fechando o buraco. Nas pastas, "Abrir no editor" cria um projeto com os arquivos escolhidos.
- `/plugin` Plugin do ChatGPT e do Claude: conexões, o que o assistente pode fazer (com permissão por ação), atividade e exemplos de pedidos.
- `/contas`, `/configuracoes`, `/notificacoes`, `/login`.

Os posts e os projetos do editor ficam no `localStorage` do navegador. No editor, os vídeos e imagens aparecem como placeholders até os arquivos virem do Storage.

## Organização

```
src/
  app/               rotas finas (Next.js), só chamam as features
  features/
    spaces/          spaces, pastas e arquivos (telas, tipos e dados de exemplo)
    posts/           postar, agendados, contas (telas, tipos, dados de exemplo e store)
    home/            tela inicial, que junta spaces e posts
    plugin/          integração com ChatGPT e Claude (MCP); usa spaces e posts
    editor/          editor de vídeo
      project/       tipos, operações (mover, cortar, dividir, velocidade...), keyframes, copiar e colar, dados de exemplo e o estado com desfazer
      timeline/      linha do tempo e os clipes (com keyframes, transições e velocidade)
      preview/       Remotion Player e a camada de seleção sobre o vídeo
      panels/        painel da esquerda (mídia, texto, formas, áudio, IA) e propriedades
      remotion/      a composição que lê o projeto e desenha o vídeo; blocks/ por tipo e animate.ts (keyframes, transições, filtros, fontes)
      ai/            ações da IA (hoje um parser de demonstração; usa as mesmas operações da linha do tempo)
  components/        Sidebar e o CSS base compartilhado
  lib/               utilitários gerais (formatação)
```

Cada feature ganha `server/` (banco, storage, publicação) e `api/` só quando tiver código para isso, nas próximas fases. O plugin terá `server/` com as ferramentas MCP e o OAuth (comum ao ChatGPT e ao Claude) e, quando houver cards dentro do chat, `chatgpt/widgets/`.

## Próximas fases

- Fase 2: login, banco e arquivos no Supabase (Auth, Postgres e Storage).
- Fase 3: publicação de verdade (Postiz ou API do Instagram).
- Editor: exportação em MP4 (Remotion Lambda) de volta para o Space, IA de verdade usando as operações de `editor/project/ops.ts` e legenda automática.

## Desenvolvimento

```bash
pnpm install
pnpm dev
```
