// The connectors the workspace can turn on. They all go through Composio (login, tokens, actions);
// each one needs an auth config there, mapped by id in COMPOSIO_AUTH_CONFIGS (see composio.ts).
import type { Network } from '@/features/posts/data'

export type Category = 'redes' | 'anuncios' | 'arquivos' | 'dados' | 'avisos'
export const categories: { id: Category; label: string; blurb: string }[] = [
  { id: 'redes', label: 'Redes sociais', blurb: 'Onde o OttoSocial publica e de onde puxa as métricas.' },
  { id: 'anuncios', label: 'Anúncios', blurb: 'Campanhas, gasto e resultados das suas contas de anúncio.' },
  { id: 'arquivos', label: 'Arquivos e design', blurb: 'De onde vêm os vídeos e as artes que vão para os Spaces.' },
  { id: 'dados', label: 'Dados e vendas', blurb: 'Resultados do site, planilhas, loja e CRM ligados aos seus posts.' },
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
  /** The service's logo (public/logos/connectors, from the CC0 sets of gilbarbara/logos and Simple Icons). */
  logo?: string
  /** Brand color, for the initial badge of a connector without a logo file. */
  color: string
  /** The social network it stands for in Postar / Agendados, when it is one of them. */
  network?: Network
  /** Composio toolkit slug, to check against the Composio dashboard when setting up its auth config. */
  toolkit: string
}

export const connectors: Connector[] = [
  // ---------- redes sociais ----------
  { id: 'instagram', logo: '/logos/connectors/instagram-icon.svg', name: 'Instagram', category: 'redes', network: 'instagram', toolkit: 'instagram', color: '#d62976',
    description: 'Publicar Reels, Feed e Stories e ler as métricas.', permissions: ['Publicar Reels, Feed e Stories', 'Ler métricas dos posts', 'Ler comentários'] },
  { id: 'tiktok', logo: '/logos/connectors/tiktok-icon.svg', name: 'TikTok', category: 'redes', network: 'tiktok', toolkit: 'tiktok', color: '#111111',
    description: 'Publicar vídeos e fotos e acompanhar as visualizações.', permissions: ['Publicar vídeos e fotos', 'Ler métricas dos vídeos'] },
  { id: 'linkedin', logo: '/logos/connectors/linkedin-icon.svg', name: 'LinkedIn', category: 'redes', network: 'linkedin', toolkit: 'linkedin', color: '#0a66c2',
    description: 'Publicar na página da empresa e ler o alcance.', permissions: ['Publicar na página da empresa', 'Ler métricas da página'] },
  { id: 'youtube', logo: '/logos/connectors/youtube-icon.svg', name: 'YouTube', category: 'redes', network: 'youtube', toolkit: 'youtube', color: '#ff0000',
    description: 'Publicar Shorts e ler as métricas do canal.', permissions: ['Publicar Shorts e vídeos', 'Ler métricas do canal'] },
  { id: 'facebook', logo: '/logos/connectors/facebook.svg', name: 'Facebook', category: 'redes', toolkit: 'facebook', color: '#1877f2',
    description: 'Publicar na página e ler curtidas e comentários.', permissions: ['Publicar na página', 'Ler métricas e comentários da página'] },
  { id: 'twitter', logo: '/logos/connectors/x.svg', name: 'X', category: 'redes', toolkit: 'twitter', color: '#111111',
    description: 'Publicar posts e acompanhar o engajamento.', permissions: ['Publicar posts', 'Ler métricas dos posts'] },
  { id: 'pinterest', logo: '/logos/connectors/pinterest.svg', name: 'Pinterest', category: 'redes', toolkit: 'pinterest', color: '#e60023',
    description: 'Criar pins a partir dos seus vídeos e imagens.', permissions: ['Criar pins nas suas pastas', 'Ler métricas dos pins'] },

  // ---------- anúncios ----------
  { id: 'metaads', logo: '/logos/connectors/meta-icon.svg', name: 'Meta Ads', category: 'anuncios', toolkit: 'metaads', color: '#0866ff',
    description: 'Campanhas do Instagram e do Facebook, gasto e resultados.', permissions: ['Ver campanhas, gasto e resultados', 'Impulsionar um post publicado (sempre com a sua confirmação)'] },
  { id: 'googleads', logo: '/logos/connectors/google-ads.svg', name: 'Google Ads', category: 'anuncios', toolkit: 'googleads', color: '#1a73e8',
    description: 'Campanhas de pesquisa e do YouTube em um só lugar.', permissions: ['Ver campanhas, gasto e conversões'] },
  { id: 'linkedinads', logo: '/logos/connectors/linkedin-icon.svg', name: 'LinkedIn Ads', category: 'anuncios', toolkit: 'linkedin_ads', color: '#0a66c2',
    description: 'Resultados das campanhas e dos posts patrocinados.', permissions: ['Ver campanhas, gasto e resultados'] },
  { id: 'tiktokads', logo: '/logos/connectors/tiktok-icon.svg', name: 'TikTok Ads', category: 'anuncios', toolkit: 'tiktok_ads', color: '#111111',
    description: 'Gasto e resultados dos anúncios no TikTok.', permissions: ['Ver campanhas, gasto e resultados'] },

  { id: 'pinterestads', logo: '/logos/connectors/pinterest.svg', name: 'Pinterest Ads', category: 'anuncios', toolkit: 'pinterest_ads', color: '#e60023',
    description: 'Campanhas e resultados dos pins promovidos.', permissions: ['Ver campanhas, gasto e resultados'] },

  // ---------- arquivos e design ----------
  { id: 'googledrive', logo: '/logos/connectors/google-drive.svg', name: 'Google Drive', category: 'arquivos', toolkit: 'googledrive', color: '#1fa463',
    description: 'Importar vídeos e imagens de uma pasta para os Spaces.', permissions: ['Ver e baixar os arquivos que você escolher', 'Acompanhar uma pasta para importar o que chegar nela'] },
  { id: 'dropbox', logo: '/logos/connectors/dropbox.svg', name: 'Dropbox', category: 'arquivos', toolkit: 'dropbox', color: '#0061ff',
    description: 'Trazer os arquivos da equipe para os Spaces.', permissions: ['Ver e baixar os arquivos que você escolher'] },
  { id: 'onedrive', logo: '/logos/connectors/microsoft-onedrive.svg', name: 'OneDrive', category: 'arquivos', toolkit: 'one_drive', color: '#0078d4',
    description: 'Importar mídia do OneDrive para os Spaces.', permissions: ['Ver e baixar os arquivos que você escolher'] },
  { id: 'canva', name: 'Canva', category: 'arquivos', toolkit: 'canva', color: '#00c4cc',
    description: 'Trazer artes prontas direto para os Spaces e o editor.', permissions: ['Ver os seus designs', 'Exportar designs como imagem ou vídeo'] },

  { id: 'notion', logo: '/logos/connectors/notion-icon.svg', name: 'Notion', category: 'arquivos', toolkit: 'notion', color: '#191919',
    description: 'Puxar ideias, roteiros e o calendário de conteúdo da equipe.', permissions: ['Ler as páginas e bancos de dados que você compartilhar'] },

  // ---------- dados e vendas ----------
  { id: 'googleanalytics', logo: '/logos/connectors/google-analytics.svg', name: 'Google Analytics', category: 'dados', toolkit: 'google_analytics', color: '#e37400',
    description: 'Ver quantas visitas e vendas no site vieram de cada post.', permissions: ['Ler relatórios de tráfego e conversões do site'] },
  { id: 'googlesheets', logo: '/logos/connectors/google-sheets.svg', name: 'Google Sheets', category: 'dados', toolkit: 'googlesheets', color: '#0f9d58',
    description: 'Exportar métricas e importar um calendário de posts de uma planilha.', permissions: ['Ler e escrever nas planilhas que você escolher'] },
  { id: 'shopify', logo: '/logos/connectors/shopify.svg', name: 'Shopify', category: 'dados', toolkit: 'shopify', color: '#5e8e3e',
    description: 'Transformar produtos da loja em posts, com foto, preço e link.', permissions: ['Ver produtos e coleções da loja'] },
  { id: 'hubspot', logo: '/logos/connectors/hubspot.svg', name: 'HubSpot', category: 'dados', toolkit: 'hubspot', color: '#ff7a59',
    description: 'Ligar posts e campanhas aos contatos e negócios do CRM.', permissions: ['Ver contatos, negócios e campanhas'] },
  { id: 'rdstation', name: 'RD Station', category: 'dados', toolkit: 'rd_station_marketing', color: '#1b4bd1',
    description: 'Ver os leads que chegaram pelas redes e as campanhas de marketing.', permissions: ['Ver leads, campanhas e conversões'] },

  // ---------- avisos ----------
  { id: 'slack', logo: '/logos/connectors/slack-icon.svg', name: 'Slack', category: 'avisos', toolkit: 'slack', color: '#4a154b',
    description: 'Avisar um canal quando um post sai, falha ou espera aprovação.', permissions: ['Enviar mensagens no canal que você escolher'] },
  { id: 'gmail', logo: '/logos/connectors/google-gmail.svg', name: 'Gmail', category: 'avisos', toolkit: 'gmail', color: '#ea4335',
    description: 'Mandar o resumo da semana e os alertas por e-mail.', permissions: ['Enviar e-mails em seu nome para a equipe'] },
  { id: 'whatsapp', logo: '/logos/connectors/whatsapp-icon.svg', name: 'WhatsApp', category: 'avisos', toolkit: 'whatsapp', color: '#25d366',
    description: 'Receber no celular quando algo precisa da sua atenção.', permissions: ['Enviar mensagens para os números cadastrados'] },
  { id: 'teams', logo: '/logos/connectors/microsoft-teams.svg', name: 'Microsoft Teams', category: 'avisos', toolkit: 'microsoft_teams', color: '#5b5fc7',
    description: 'Avisar um canal do Teams quando um post sai, falha ou espera aprovação.', permissions: ['Enviar mensagens no canal que você escolher'] },
  { id: 'telegram', logo: '/logos/connectors/telegram.svg', name: 'Telegram', category: 'avisos', toolkit: 'telegram', color: '#229ed9',
    description: 'Receber os alertas por um bot do Telegram.', permissions: ['Enviar mensagens pelo bot para o seu chat ou grupo'] },
]

export const connectorById = (id: string) => connectors.find(c => c.id === id)
export const connectorForNetwork = (n: Network) => connectors.find(c => c.network === n)
