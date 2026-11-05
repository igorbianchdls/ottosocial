// The connectors the workspace can turn on. They all go through Composio (login, tokens, actions);
// each one needs an auth config there, mapped by id in COMPOSIO_AUTH_CONFIGS (see composio.ts).
import type { Network } from '@/features/posts/data'

export type Category = 'redes' | 'anuncios' | 'arquivos' | 'avisos'
export const categories: { id: Category; label: string; blurb: string }[] = [
  { id: 'redes', label: 'Redes sociais', blurb: 'Onde o OttoSocial publica e de onde puxa as métricas.' },
  { id: 'anuncios', label: 'Anúncios', blurb: 'Campanhas, gasto e resultados das suas contas de anúncio.' },
  { id: 'arquivos', label: 'Arquivos e design', blurb: 'De onde vêm os vídeos e as artes que vão para os Spaces.' },
  { id: 'avisos', label: 'Avisos', blurb: 'Onde a equipe fica sabendo quando um post sai, falha ou espera aprovação.' },
]

export type Connector = {
  /** Our id; also the key in COMPOSIO_AUTH_CONFIGS and the "connector" column in Supabase. */
  id: string
  name: string
  category: Category
  /** One line on the card. */
  description: string
  /** What the OttoSocial does with it, shown before connecting and on its page. */
  permissions: string[]
  /** Badge color (just a color and the initial: no brand logos). */
  color: string
  /** The social network it stands for in Postar / Agendados, when it is one of them. */
  network?: Network
  /** Composio toolkit slug, to check against the Composio dashboard when setting up its auth config. */
  toolkit: string
}

export const connectors: Connector[] = [
  // ---------- redes sociais ----------
  { id: 'instagram', name: 'Instagram', category: 'redes', network: 'instagram', toolkit: 'instagram', color: '#d62976',
    description: 'Publicar Reels, Feed e Stories e ler as métricas.', permissions: ['Publicar Reels, Feed e Stories', 'Ler métricas dos posts', 'Ler comentários'] },
  { id: 'tiktok', name: 'TikTok', category: 'redes', network: 'tiktok', toolkit: 'tiktok', color: '#111111',
    description: 'Publicar vídeos e fotos e acompanhar as visualizações.', permissions: ['Publicar vídeos e fotos', 'Ler métricas dos vídeos'] },
  { id: 'linkedin', name: 'LinkedIn', category: 'redes', network: 'linkedin', toolkit: 'linkedin', color: '#0a66c2',
    description: 'Publicar na página da empresa e ler o alcance.', permissions: ['Publicar na página da empresa', 'Ler métricas da página'] },
  { id: 'youtube', name: 'YouTube', category: 'redes', network: 'youtube', toolkit: 'youtube', color: '#ff0000',
    description: 'Publicar Shorts e ler as métricas do canal.', permissions: ['Publicar Shorts e vídeos', 'Ler métricas do canal'] },
  { id: 'facebook', name: 'Facebook', category: 'redes', toolkit: 'facebook', color: '#1877f2',
    description: 'Publicar na página e ler curtidas e comentários.', permissions: ['Publicar na página', 'Ler métricas e comentários da página'] },
  { id: 'twitter', name: 'X', category: 'redes', toolkit: 'twitter', color: '#111111',
    description: 'Publicar posts e acompanhar o engajamento.', permissions: ['Publicar posts', 'Ler métricas dos posts'] },
  { id: 'pinterest', name: 'Pinterest', category: 'redes', toolkit: 'pinterest', color: '#e60023',
    description: 'Criar pins a partir dos seus vídeos e imagens.', permissions: ['Criar pins nas suas pastas', 'Ler métricas dos pins'] },

  // ---------- anúncios ----------
  { id: 'metaads', name: 'Meta Ads', category: 'anuncios', toolkit: 'metaads', color: '#0866ff',
    description: 'Campanhas do Instagram e do Facebook, gasto e resultados.', permissions: ['Ver campanhas, gasto e resultados', 'Impulsionar um post publicado (sempre com a sua confirmação)'] },
  { id: 'googleads', name: 'Google Ads', category: 'anuncios', toolkit: 'googleads', color: '#1a73e8',
    description: 'Campanhas de pesquisa e do YouTube em um só lugar.', permissions: ['Ver campanhas, gasto e conversões'] },
  { id: 'linkedinads', name: 'LinkedIn Ads', category: 'anuncios', toolkit: 'linkedin', color: '#0a66c2',
    description: 'Resultados das campanhas e dos posts patrocinados.', permissions: ['Ver campanhas, gasto e resultados'] },
  { id: 'tiktokads', name: 'TikTok Ads', category: 'anuncios', toolkit: 'tiktok_ads', color: '#111111',
    description: 'Gasto e resultados dos anúncios no TikTok.', permissions: ['Ver campanhas, gasto e resultados'] },

  // ---------- arquivos e design ----------
  { id: 'googledrive', name: 'Google Drive', category: 'arquivos', toolkit: 'googledrive', color: '#1fa463',
    description: 'Importar vídeos e imagens de uma pasta para os Spaces.', permissions: ['Ver e baixar os arquivos que você escolher', 'Acompanhar uma pasta para importar o que chegar nela'] },
  { id: 'dropbox', name: 'Dropbox', category: 'arquivos', toolkit: 'dropbox', color: '#0061ff',
    description: 'Trazer os arquivos da equipe para os Spaces.', permissions: ['Ver e baixar os arquivos que você escolher'] },
  { id: 'onedrive', name: 'OneDrive', category: 'arquivos', toolkit: 'one_drive', color: '#0078d4',
    description: 'Importar mídia do OneDrive para os Spaces.', permissions: ['Ver e baixar os arquivos que você escolher'] },
  { id: 'canva', name: 'Canva', category: 'arquivos', toolkit: 'canva', color: '#00c4cc',
    description: 'Trazer artes prontas direto para os Spaces e o editor.', permissions: ['Ver os seus designs', 'Exportar designs como imagem ou vídeo'] },

  // ---------- avisos ----------
  { id: 'slack', name: 'Slack', category: 'avisos', toolkit: 'slack', color: '#4a154b',
    description: 'Avisar um canal quando um post sai, falha ou espera aprovação.', permissions: ['Enviar mensagens no canal que você escolher'] },
  { id: 'gmail', name: 'Gmail', category: 'avisos', toolkit: 'gmail', color: '#ea4335',
    description: 'Mandar o resumo da semana e os alertas por e-mail.', permissions: ['Enviar e-mails em seu nome para a equipe'] },
  { id: 'whatsapp', name: 'WhatsApp', category: 'avisos', toolkit: 'whatsapp', color: '#25d366',
    description: 'Receber no celular quando algo precisa da sua atenção.', permissions: ['Enviar mensagens para os números cadastrados'] },
]

export const connectorById = (id: string) => connectors.find(c => c.id === id)
export const connectorForNetwork = (n: Network) => connectors.find(c => c.network === n)
