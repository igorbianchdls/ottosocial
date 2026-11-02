# OttoSocial

Spaces de mídias com publicação em redes sociais.

## Fase 1 (esta versão)

Interface completa com dados de exemplo, sem backend:

- `/` Início: armazenamento, próximos posts, arquivos recentes e publicados.
- `/spaces` Todos os spaces em cards, com o armazenamento usado, a divisão por tipo e os arquivos recentes.
- `/spaces/[id]` e `/pastas/[id]` Explorador no estilo Google Drive: pastas e arquivos na mesma tela, pasta dentro de pasta, botão "+ Novo" (nova pasta, enviar arquivos, enviar pasta), busca na pasta e subpastas, filtros (tipo, data, tamanho), ordenação, grade ou lista, clique direito (abrir, postar, abrir no editor, renomear, mover, fazer cópia, baixar, favoritar, lixeira), seleção com Ctrl/Shift, arrastar para mover, painel de detalhes, visualizador em tela cheia e atalhos (Delete, F2, Enter, Ctrl+A).
- `/spaces/recentes`, `/spaces/favoritos`, `/spaces/lixeira` (restaurar, excluir para sempre, esvaziar).
- `/postar` Composer: mídia dos spaces (na ordem escolhida), contas, formato (Reel, Story, Feed/carrossel), legenda com contador por rede e hashtags, avisos (limites, formato x mídia, Story sem legenda, corte do “mais” no Instagram), publicar agora ou agendar, e prévia de Instagram Reels, Feed, Story e TikTok. `/postar?editar=<id>` edita rascunhos e agendados.
- `/posts` Lista (filtros e busca), Semana (por hora) e Mês, com arrastar e soltar para reagendar (e desfazer), painel do post com métricas, e ações: editar, duplicar, publicar agora, mover para rascunhos, excluir (com desfazer).
- `/editor` Projetos de vídeo. `/editor/[id]` Editor com linha do tempo (faixas de texto, legenda, forma, imagem, vídeo e áudio; mover, cortar pontas, dividir, ímã, zoom, desfazer), prévia em Remotion com seleção e arraste direto no vídeo, painel de propriedades e um chat de IA de demonstração. Recursos: keyframes (mover, escala, rotação, opacidade), transições de entrada e saída (fade, deslizar, zoom, desfoque), velocidade (0,5x a 3x), filtros (P&B, vívido, quente, vintage, escuro, brilho, contraste, saturação), fontes, seleção múltipla com arraste em grupo, copiar/recortar/colar, excluir fechando o buraco, seleção por caixa, transição no corte entre dois clipes, inserir empurrando, travar e reordenar faixas, marcadores (M), fade de áudio e ducking (a trilha abaixa durante a narração), contorno e sombra no texto, modelos de texto (manchete, nome e cargo, destaque), stickers animados, barra de progresso, marca d'água, recortar/espelhar, encaixe com fundo desfocado, modelos de projeto (Reel 15s, Story, 16:9, quadrado) e versões salvas, agrupar clipes (Ctrl+G), guias de alinhamento e botões de alinhar na prévia, keyframes de cor e tamanho do texto, tela cheia (F), repetir trecho entre marcadores, J/K/L, zoom com Ctrl+roda e layout de celular com abas Ferramentas/Propriedades. Nas pastas, "Abrir no editor" cria um projeto com os arquivos escolhidos.
- `/plugin` Plugin do ChatGPT e do Claude: conexões, o que o assistente pode fazer (com permissão por ação), atividade e exemplos de pedidos.
- Busca global (Ctrl+K ou "Buscar" no menu): arquivos, pastas, spaces, posts e projetos do editor, sem acento e com várias palavras, além de ações rápidas e atalhos de navegação. Abrir um arquivo leva à pasta com o visualizador aberto; abrir um post abre o painel dele.
- `/notificacoes` Notificações agrupadas por dia (hoje, ontem, esta semana), abas Todas/Não lidas, filtros por tipo, marcar como lida (uma ou todas, com desfazer), apagar, e ação direta (ver post, reconectar, abrir pasta). O contador do menu mostra as não lidas. Posts agendados/publicados e envios de arquivos geram notificações.
- `/configuracoes` Perfil (nome, cargo, cor), workspace (nome, fuso, idioma), aparência (claro, escuro, igual ao sistema, modo compacto), notificações (por tipo, canais, horário silencioso), publicação (contas, formato, horário e hashtags padrão, confirmar antes de publicar), armazenamento, atalhos e dados (exportar e importar backup, recomeçar com os dados de exemplo).
- `/contas` Cartões por rede com status (conectada, reconectar, não conectada), números de posts e visualizações, conectar com janela de permissões (simulada), reconectar e desconectar. O Composer usa esse status.
- `/apresentacao` Página pública do produto: recursos, como funciona, editor, plugin, preços (valores de exemplo), perguntas e chamada para criar conta.
- Página de "não encontrado" e tour de boas-vindas no primeiro acesso (pode ser revisto em Configurações → Atalhos).
- `/login`, `/cadastro` (3 etapas: conta com medidor de senha, workspace, conectar redes) e `/recuperar-senha`, com validação e vitrine do produto ao lado. Em demonstração: qualquer e-mail válido e senha de 8 caracteres entram; o cadastro preenche o perfil e o workspace em Configurações. O login de verdade vem com o Supabase Auth.

Os spaces, pastas, arquivos, posts e projetos do editor ficam no `localStorage` do navegador, e os arquivos enviados ficam no IndexedDB (com prévia real de imagem e vídeo). No editor, os vídeos e imagens aparecem como placeholders até os arquivos virem do Storage.

## Organização

```
src/
  app/               rotas finas (Next.js), só chamam as features
  features/
    spaces/          spaces, pastas e arquivos: store.ts (dados e ações), blobs.ts (arquivos enviados), hooks.ts, drive/ (explorador, menus, janelas, visualizador)
    posts/           postar, agendados, contas (telas, tipos, dados de exemplo e store)
    home/            tela inicial, que junta spaces e posts
    plugin/          integração com ChatGPT e Claude (MCP); usa spaces e posts
    notifications/   notificações (dados, store e tela)
    settings/        configurações (store, tela e o tema)
    auth/            login, cadastro e recuperar senha (sessão de demonstração)
    landing/         página de apresentação
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

## Banco de dados (Supabase)

O schema está em `supabase/migrations/20261102000001_init.sql`: workspaces e membros, spaces, pastas (com subpastas), arquivos, favoritos e recentes, contas sociais (tokens só no servidor), posts (arquivos e contas por post), projetos e versões do editor, notificações, configurações e plugin. Todas as tabelas têm RLS: cada pessoa só vê e altera os workspaces de que é membro. Os arquivos ficam no bucket privado `media`, numa pasta por workspace (`<workspace_id>/...`).

`20261102000002_jobs_invites_private.sql` acrescenta:

- schema `private` (fora da API): tokens das contas, estados de OAuth e as funções internas de permissão. O servidor acessa os tokens só pelas funções `account_token_get/save` e `oauth_state_create/consume`, liberadas apenas para a chave secreta;
- filas `file_jobs` (miniatura e proxy, criadas sozinhas a cada upload) e `publish_jobs` (uma por post e rede, mantida em dia quando o post é agendado, reagendado ou desagendado). Os workers pegam tarefas com `claim_file_jobs()` / `claim_publish_jobs()`;
- convites `workspace_invites`, aceitos com `accept_invite(token)` pelo e-mail convidado;
- `tags` em arquivos.

`20261102000003_signup_workspace.sql`: o cadastro cria o perfil e o primeiro workspace (com quem se cadastrou como dono), e apagar uma pessoa não apaga o que ela criou para a equipe.

Para aplicar: Supabase → SQL Editor → colar os arquivos em ordem → Run (ou `supabase db push`).

### Login

Login, cadastro, "esqueci a senha" e sair usam o Supabase Auth (`src/lib/supabase`). O `src/proxy.ts` mantém a sessão nos cookies e manda quem não entrou para `/login` (ou `/apresentacao`, na raiz). Links dos e-mails do Supabase voltam por `/auth/callback`; a senha nova é criada em `/nova-senha`. Sem as variáveis `NEXT_PUBLIC_SUPABASE_*` o app roda como demonstração, sem login.

Copie `.env.example` para `.env.local` e preencha a chave publicável do projeto.
