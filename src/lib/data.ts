export type FileKind = 'video' | 'image' | 'text'
export type MediaFile = { id: string; folderId: string; name: string; kind: FileKind; size: number; duration?: number; width: number; height: number; createdAt: string; tone: string }
export type Folder = { id: string; projectId: string; name: string; description: string; tags: string[]; createdAt: string; updatedAt: string }
export type Project = { id: string; name: string }
export type Network = 'instagram' | 'tiktok' | 'linkedin' | 'youtube'
export type Account = { id: string; network: Network; handle: string; name: string; connected: boolean }
export type PostFormat = 'reel' | 'story' | 'feed'
export type PostStatus = 'agendado' | 'publicado' | 'erro' | 'rascunho'
export type Post = { id: string; fileIds: string[]; caption: string; accountIds: string[]; format: PostFormat; date: string; status: PostStatus; url?: string; metrics?: { views: number; likes: number; comments: number; shares: number } }

export const projects: Project[] = [
  { id: 'otto', name: 'Otto ERP' },
  { id: 'lumen', name: 'Lumen Hotel' },
  { id: 'pessoal', name: 'Pessoal' },
]

export const tagTone: Record<string, string> = { Reels: 'blue', Vendas: 'blue', Marketing: 'gray', Anúncios: 'red', Bastidores: 'green', Institucional: 'gray', Rascunhos: 'amber' }

export const folders: Folder[] = [
  { id: 'reels', projectId: 'otto', name: 'Reels publicados', description: 'Vídeos que já foram ao ar no @otto.erp.', tags: ['Reels', 'Marketing'], createdAt: '2026-09-02', updatedAt: '2026-10-31' },
  { id: 'brutos', projectId: 'otto', name: 'Vídeos brutos', description: 'Gravações originais antes da edição.', tags: ['Bastidores'], createdAt: '2026-08-14', updatedAt: '2026-10-29' },
  { id: 'artes', projectId: 'otto', name: 'Artes e carrosséis', description: 'Imagens para feed e carrosséis.', tags: ['Marketing'], createdAt: '2026-08-20', updatedAt: '2026-10-25' },
  { id: 'stories', projectId: 'otto', name: 'Stories', description: 'Formatos verticais de 15 segundos.', tags: ['Marketing'], createdAt: '2026-09-11', updatedAt: '2026-10-30' },
  { id: 'anuncios', projectId: 'otto', name: 'Anúncios', description: 'Criativos para campanhas pagas.', tags: ['Anúncios', 'Vendas'], createdAt: '2026-09-21', updatedAt: '2026-10-27' },
  { id: 'ideias', projectId: 'otto', name: 'Ideias e roteiros', description: 'Roteiros, ganchos e legendas.', tags: ['Rascunhos'], createdAt: '2026-08-01', updatedAt: '2026-10-31' },
  { id: 'hotel-fotos', projectId: 'lumen', name: 'Fotos do hotel', description: 'Quartos, piscina e áreas comuns.', tags: ['Institucional'], createdAt: '2026-07-10', updatedAt: '2026-10-12' },
  { id: 'hotel-reels', projectId: 'lumen', name: 'Reels do app', description: 'Gravações de tela do app no celular.', tags: ['Reels'], createdAt: '2026-10-28', updatedAt: '2026-10-30' },
  { id: 'pessoal-geral', projectId: 'pessoal', name: 'Geral', description: 'Arquivos soltos.', tags: [], createdAt: '2026-06-01', updatedAt: '2026-10-01' },
]

const tones = ['sand', 'blue', 'rose', 'green', 'violet', 'amber']
const MB = 1024 * 1024
let n = 0
const file = (folderId: string, name: string, kind: FileKind, sizeMb: number, duration?: number, w = 1080, h = 1920): MediaFile =>
  ({ id: `f${++n}`, folderId, name, kind, size: Math.round(sizeMb * MB), duration, width: w, height: h, createdAt: `2026-10-${String(30 - (n % 28)).padStart(2, '0')}`, tone: tones[n % tones.length] })

export const files: MediaFile[] = [
  file('reels', 'ChatGPT emite nota fiscal (A).mp4', 'video', 8.1, 49),
  file('reels', 'ChatGPT cobra seus clientes.mp4', 'video', 8.5, 48),
  file('reels', 'Funcionária de R$ 0.mp4', 'video', 6.5, 40),
  file('reels', 'ChatGPT matou o Conta Azul.mp4', 'video', 4.0, 30),
  file('reels', 'Agora o ChatGPT pode — lucro.mp4', 'video', 5.5, 34),
  file('reels', 'Otto preocupa os contadores.mp4', 'video', 11.4, 31),
  file('reels', 'Notas fiscais (tela real).mp4', 'video', 11.6, 70),
  file('reels', 'Financeiro (tela real).mp4', 'video', 13.2, 75),
  file('reels', 'Substituir o sistema difícil.mp4', 'video', 5.3, 33),
  file('reels', 'Fazer tudo conversando.mp4', 'video', 5.3, 32),
  file('reels', 'Ser seu sistema de gestão.mp4', 'video', 5.1, 32),
  file('reels', 'Emite várias notas (B).mp4', 'video', 8.7, 50),
  file('brutos', 'Gravação apresentador 01.mov', 'video', 412, 312, 3840, 2160),
  file('brutos', 'Gravação apresentador 02.mov', 'video', 388, 287, 3840, 2160),
  file('brutos', 'Tela ChatGPT iPhone.mov', 'video', 96, 142),
  file('brutos', 'B-roll escritório.mp4', 'video', 220, 96, 3840, 2160),
  file('artes', 'Carrossel 5 sinais de caixa apertado.png', 'image', 2.4, undefined, 1080, 1350),
  file('artes', 'Capa — Nota fiscal no ChatGPT.png', 'image', 1.1, undefined, 1080, 1350),
  file('artes', 'Post lançamento Otto.jpg', 'image', 0.9, undefined, 1080, 1080),
  file('artes', 'Comparativo Otto x ERP.png', 'image', 1.6, undefined, 1080, 1350),
  file('stories', 'Story enquete planilha.mp4', 'video', 3.2, 15),
  file('stories', 'Story bastidores.mp4', 'video', 4.1, 15),
  file('anuncios', 'Anúncio 9x16 — Comenta NOTA.mp4', 'video', 7.9, 22),
  file('anuncios', 'Anúncio 1x1 — Sistema.mp4', 'video', 5.6, 20, 1080, 1080),
  file('ideias', 'Roteiros novembro.txt', 'text', 0.02),
  file('ideias', 'Ganchos que funcionaram.txt', 'text', 0.01),
  file('hotel-fotos', 'Piscina pôr do sol.jpg', 'image', 3.2, undefined, 1920, 1080),
  file('hotel-fotos', 'Suíte vista mar.jpg', 'image', 2.8, undefined, 1920, 1080),
  file('hotel-reels', 'Lumen Hotel no celular.mp4', 'video', 6.2, 24),
]

export const accounts: Account[] = [
  { id: 'ig-otto', network: 'instagram', handle: '@otto.erp', name: 'Otto ERP', connected: true },
  { id: 'tt-otto', network: 'tiktok', handle: '@otto.erp', name: 'Otto ERP', connected: true },
  { id: 'li-otto', network: 'linkedin', handle: 'Otto ERP', name: 'Página da empresa', connected: false },
  { id: 'yt-otto', network: 'youtube', handle: '@ottoerp', name: 'Otto ERP Shorts', connected: false },
]

const m = (views: number, likes: number, comments: number, shares: number) => ({ views, likes, comments, shares })
export const initialPosts: Post[] = [
  { id: 'p1', fileIds: ['f1'], caption: 'O ChatGPT agora emite nota fiscal. 🧾 Comenta NOTA que eu te mando o acesso.', accountIds: ['ig-otto'], format: 'reel', date: '2026-10-30T18:09', status: 'publicado', url: 'https://www.instagram.com/reel/DfIO7EKEw71/', metrics: m(4820, 312, 87, 41) },
  { id: 'p2', fileIds: ['f2'], caption: 'O ChatGPT agora cobra os clientes que te devem. 💸 Comenta COBRANÇA.', accountIds: ['ig-otto'], format: 'reel', date: '2026-10-30T18:40', status: 'publicado', url: 'https://www.instagram.com/reel/DfIYGhlIej2/', metrics: m(3110, 198, 54, 22) },
  { id: 'p3', fileIds: ['f3'], caption: 'Contratei uma IA pra cuidar do meu financeiro. 🤖 Comenta IA.', accountIds: ['ig-otto'], format: 'reel', date: '2026-10-30T19:20', status: 'publicado', url: 'https://www.instagram.com/reel/DfIdAmFgIXZ/', metrics: m(6390, 451, 132, 67) },
  { id: 'p4', fileIds: ['f4'], caption: 'O ChatGPT acabou de matar o Conta Azul. 👀 Comenta SISTEMA.', accountIds: ['ig-otto'], format: 'reel', date: '2026-10-30T21:30', status: 'publicado', url: 'https://www.instagram.com/reel/DfIoVPkD0Eh/', metrics: m(9870, 702, 214, 118) },
  { id: 'p5', fileIds: ['f12'], caption: 'O ChatGPT agora emite todas as suas notas fiscais de uma vez. 🧾⚡ Comenta NOTA.', accountIds: ['ig-otto'], format: 'reel', date: '2026-11-01T15:10', status: 'publicado', url: 'https://www.instagram.com/reel/DfKjxvkFU3O/', metrics: m(1240, 88, 19, 9) },
  { id: 'p6', fileIds: ['f21'], caption: 'Você ainda controla o caixa na planilha? Responde a enquete 👇', accountIds: ['ig-otto'], format: 'story', date: '2026-11-02T12:00', status: 'agendado' },
  { id: 'p7', fileIds: ['f23'], caption: 'Emite a nota sem sair do ChatGPT. Comenta NOTA.', accountIds: ['ig-otto', 'tt-otto'], format: 'reel', date: '2026-11-03T19:00', status: 'agendado' },
  { id: 'p8', fileIds: ['f17'], caption: '5 sinais de que o seu caixa tá apertado (e como resolver).', accountIds: ['ig-otto'], format: 'feed', date: '2026-11-05T12:30', status: 'agendado' },
  { id: 'p9', fileIds: ['f29'], caption: 'Seu hotel inteiro no celular.', accountIds: ['tt-otto'], format: 'reel', date: '2026-11-06T18:00', status: 'rascunho' },
]

export const STORAGE_LIMIT = 5 * 1024 * MB

export function formatSize(bytes: number) {
  if (bytes >= 1024 * MB) return `${(bytes / (1024 * MB)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`
  if (bytes >= MB) return `${(bytes / MB).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
export const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
export const formatDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00` : iso).toLocaleDateString('pt-BR')
export const formatDateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '')
export const folderFiles = (folderId: string) => files.filter(f => f.folderId === folderId)
export const folderSize = (folderId: string) => folderFiles(folderId).reduce((v, f) => v + f.size, 0)
export const networkLabel: Record<Network, string> = { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', youtube: 'YouTube' }
export const formatLabel: Record<PostFormat, string> = { reel: 'Reel', story: 'Story', feed: 'Feed' }
