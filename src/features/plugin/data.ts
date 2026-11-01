// Sample data for the ChatGPT / Claude plugin page until the MCP server exists (phase 2).

export type Assistant = 'chatgpt' | 'claude'
export type ToolGroup = 'Drive' | 'Posts' | 'Legenda'
/** What the assistant may do with a tool: run it, only prepare it for the user to confirm, or nothing. */
export type ToolMode = 'livre' | 'confirmar' | 'bloqueado'
export type Tool = { id: string; group: ToolGroup; name: string; description: string; mode: ToolMode; risky: boolean }
export type Connection = { assistant: Assistant; label: string; logo: string; connected: boolean; account?: string; connectedAt?: string; steps: string[] }
export type ActivityItem = { id: string; assistant: Assistant; text: string; tool: string; date: string; status: 'feito' | 'aguardando' | 'recusado' }

export const MCP_URL = 'https://ottosocial.app/api/mcp'

export const connections: Connection[] = [
  {
    assistant: 'chatgpt', label: 'ChatGPT', logo: '/logos/chatgpt.svg', connected: true, account: 'Workspace Otto ERP', connectedAt: '2026-10-28',
    steps: ['No ChatGPT, abra Configurações → Apps e conectores.', 'Procure por “OttoSocial” e clique em Conectar.', 'Entre com a sua conta do OttoSocial e autorize.'],
  },
  {
    assistant: 'claude', label: 'Claude', logo: '/logos/claude.svg', connected: false,
    steps: ['No Claude, abra Configurações → Conectores.', 'Clique em “Adicionar conector personalizado” e cole o endereço abaixo.', 'Entre com a sua conta do OttoSocial e autorize.'],
  },
]

export const tools: Tool[] = [
  { id: 'listar_projetos', group: 'Drive', name: 'Listar projetos e pastas', description: 'Mostra a estrutura do seu drive.', mode: 'livre', risky: false },
  { id: 'buscar_arquivos', group: 'Drive', name: 'Buscar arquivos', description: 'Encontra vídeos, imagens e textos por nome, pasta ou tipo.', mode: 'livre', risky: false },
  { id: 'detalhes_arquivo', group: 'Drive', name: 'Ver detalhes de um arquivo', description: 'Duração, tamanho, dimensões e onde já foi usado.', mode: 'livre', risky: false },
  { id: 'criar_rascunho', group: 'Posts', name: 'Criar rascunho', description: 'Monta o post com arquivo, legenda e contas, sem publicar.', mode: 'livre', risky: false },
  { id: 'agendar_post', group: 'Posts', name: 'Agendar post', description: 'Agenda para data e hora. Você confirma antes de entrar na fila.', mode: 'confirmar', risky: true },
  { id: 'publicar_agora', group: 'Posts', name: 'Publicar agora', description: 'Publica na hora nas contas escolhidas.', mode: 'bloqueado', risky: true },
  { id: 'listar_posts', group: 'Posts', name: 'Listar agendados e publicados', description: 'Mostra a agenda e o histórico de posts.', mode: 'livre', risky: false },
  { id: 'metricas_post', group: 'Posts', name: 'Ver métricas de um post', description: 'Visualizações, curtidas, comentários e compartilhamentos.', mode: 'livre', risky: false },
  { id: 'sugerir_legenda', group: 'Legenda', name: 'Sugerir legenda e hashtags', description: 'Escreve a legenda a partir do vídeo e do tom da conta.', mode: 'livre', risky: false },
]

export const activity: ActivityItem[] = [
  { id: 'a1', assistant: 'chatgpt', text: 'Agendou “Emite a nota sem sair do ChatGPT” para 03/11 às 19:00 no Instagram e TikTok.', tool: 'agendar_post', date: '2026-11-01T16:42', status: 'feito' },
  { id: 'a2', assistant: 'chatgpt', text: 'Sugeriu 3 legendas para “Anúncio 9x16 — Comenta NOTA.mp4”.', tool: 'sugerir_legenda', date: '2026-11-01T16:39', status: 'feito' },
  { id: 'a3', assistant: 'chatgpt', text: 'Pediu para agendar “Story enquete planilha” para amanhã às 12:00.', tool: 'agendar_post', date: '2026-11-01T15:10', status: 'aguardando' },
  { id: 'a4', assistant: 'chatgpt', text: 'Tentou publicar agora “Carrossel 5 sinais”. Bloqueado pela sua configuração.', tool: 'publicar_agora', date: '2026-10-31T21:05', status: 'recusado' },
  { id: 'a5', assistant: 'chatgpt', text: 'Listou os 12 Reels da pasta “Reels publicados”.', tool: 'buscar_arquivos', date: '2026-10-31T20:58', status: 'feito' },
]

export const examples = [
  'Quais Reels eu ainda não postei no TikTok?',
  'Agenda o Reel de cobrança para amanhã às 19h com uma legenda que termine em “Comenta COBRANÇA”.',
  'Qual dos meus últimos 5 posts teve mais comentários?',
  'Escreve uma legenda curta para o vídeo “Funcionária de R$ 0”.',
  'O que está agendado para esta semana?',
]

export const modeLabel: Record<ToolMode, string> = { livre: 'Pode fazer', confirmar: 'Pede confirmação', bloqueado: 'Bloqueado' }
