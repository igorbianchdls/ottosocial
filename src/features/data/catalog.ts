// What the Dados screen can sync, and how each source reaches BigQuery.

export type DataSource = 'instagram' | 'facebook' | 'metaads'
export type Stream = { id: string; label: string; text: string; tables: string[] }

/** Sources the OttoSocial job copies (through the connected account in Conectores). */
export const jobSources: { id: DataSource; name: string; logo: string; streams: Stream[]; ready: boolean; note?: string }[] = [
  {
    id: 'instagram', name: 'Instagram', logo: '/logos/connectors/instagram-icon.svg', ready: true,
    streams: [
      { id: 'posts', label: 'Posts e métricas', text: 'Cada post, e todo dia a foto das métricas dos últimos 30 dias: curtidas, comentários, alcance, visualizações, salvamentos, compartilhamentos.', tables: ['instagram_posts', 'instagram_post_metricas'] },
      { id: 'conta', label: 'Números da conta', text: 'Por dia: alcance, contas que interagiram, interações e seguidores.', tables: ['instagram_conta_diaria'] },
    ],
  },
  {
    id: 'facebook', name: 'Facebook (páginas)', logo: '/logos/connectors/facebook.svg', ready: true,
    streams: [
      { id: 'posts', label: 'Posts', text: 'Posts das páginas com reações, comentários e compartilhamentos.', tables: ['facebook_posts'] },
      { id: 'pagina', label: 'Números da página', text: 'Por dia: seguidores, novos e perdidos, visualizações e engajamento.', tables: ['facebook_pagina_diaria'] },
    ],
  },
  {
    id: 'metaads', name: 'Meta Ads', logo: '/logos/connectors/meta-icon.svg', ready: false, streams: [],
    note: 'Precisa do app da Meta aprovado para anúncios. Entra assim que estiver pronto.',
  },
]
export const jobSourceById = (id: string) => jobSources.find(s => s.id === id)

/** Google sources: Google itself delivers them to BigQuery (free); the app guides the setup. */
export const googleSources: { id: string; name: string; logo: string; how: string; steps: string[]; link: string }[] = [
  {
    id: 'ga4', name: 'Google Analytics 4', logo: '/logos/connectors/google-analytics.svg', how: 'Exportação nativa do GA4',
    steps: ['No Google Analytics, abra Administrador → Vínculos de produtos → Vínculos do BigQuery.', 'Clique em Vincular, escolha o projeto do BigQuery e a região.', 'Marque a exportação Diária (gratuita) e salve. Os dados aparecem no dataset analytics_<propriedade> no dia seguinte.'],
    link: 'https://support.google.com/analytics/answer/9823238',
  },
  {
    id: 'googleads', name: 'Google Ads', logo: '/logos/connectors/google-ads.svg', how: 'BigQuery Data Transfer Service',
    steps: ['No Google Cloud, abra BigQuery → Transferências de dados → Criar transferência.', 'Origem: Google Ads. Informe o ID do cliente (123-456-7890) e o dataset de destino.', 'Escolha a frequência diária e autorize com a conta Google que acessa os anúncios.'],
    link: 'https://cloud.google.com/bigquery/docs/google-ads-transfer',
  },
  {
    id: 'youtube', name: 'YouTube', logo: '/logos/connectors/youtube-icon.svg', how: 'BigQuery Data Transfer Service',
    steps: ['No Google Cloud, abra BigQuery → Transferências de dados → Criar transferência.', 'Origem: YouTube Channel. Escolha o dataset de destino.', 'Autorize com a conta Google dona do canal. Os relatórios chegam todo dia.'],
    link: 'https://cloud.google.com/bigquery/docs/youtube-channel-transfer',
  },
]

/** The dataset of a workspace in the OttoSocial BigQuery ("otto_org_3lh…"). */
export const datasetFor = (workspace: string) => `otto_${workspace.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`.slice(0, 1024)

/** Next run at that hour of the day in Brasília (UTC−3, no daylight saving), from now. */
export function nextDailyRun(hour: number, from = new Date()) {
  const brt = new Date(from.getTime() - 3 * 3_600_000)
  const t = new Date(Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate(), hour + 3))
  return t > from ? t : new Date(t.getTime() + 86_400_000)
}
