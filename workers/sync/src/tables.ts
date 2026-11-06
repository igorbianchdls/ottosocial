// The BigQuery tables the sync writes, one dataset per workspace. Names and columns in Portuguese, like the app.
// Every row also gets the control columns (_workspace, _conexao, _carregado_em, _origem).

export type Column = { name: string; type: 'STRING' | 'INT64' | 'FLOAT64' | 'TIMESTAMP' | 'DATE' | 'JSON' | 'BOOL'; description?: string }
export type TableSpec = {
  name: string
  description: string
  columns: Column[]
  /**
   * How a run writes it:
   *  - "merge": rows are updated or added by the key (posts, which change and must not repeat);
   *  - "partition": the day's partition is replaced (snapshots and daily numbers: a rerun never duplicates).
   */
  write: { kind: 'merge'; key: string } | { kind: 'partition'; dateColumn: string }
}

const control: Column[] = [
  { name: '_workspace', type: 'STRING', description: 'Workspace do OttoSocial' },
  { name: '_conexao', type: 'STRING', description: 'Conexão (conector) de onde veio' },
  { name: '_carregado_em', type: 'TIMESTAMP', description: 'Quando a linha foi gravada' },
  { name: '_origem', type: 'STRING', description: 'Resposta original do serviço, em JSON (use PARSE_JSON)' },
]

export const tables: Record<string, TableSpec> = {
  instagram_posts: {
    name: 'instagram_posts',
    description: 'Posts do Instagram (um por post, atualizado a cada sincronização).',
    write: { kind: 'merge', key: 'post_id' },
    columns: [
      { name: 'post_id', type: 'STRING' }, { name: 'conta', type: 'STRING' },
      { name: 'publicado_em', type: 'TIMESTAMP' }, { name: 'tipo', type: 'STRING', description: 'IMAGE, VIDEO, CAROUSEL_ALBUM' },
      { name: 'formato', type: 'STRING', description: 'FEED, REELS, STORY' },
      { name: 'legenda', type: 'STRING' }, { name: 'link', type: 'STRING' },
      ...control,
    ],
  },
  instagram_post_metricas: {
    name: 'instagram_post_metricas',
    description: 'Foto diária das métricas de cada post (dos últimos 30 dias, ou de todos na primeira carga).',
    write: { kind: 'partition', dateColumn: 'data' },
    columns: [
      { name: 'data', type: 'DATE' }, { name: 'post_id', type: 'STRING' }, { name: 'conta', type: 'STRING' },
      { name: 'curtidas', type: 'INT64' }, { name: 'comentarios', type: 'INT64' },
      { name: 'alcance', type: 'INT64' }, { name: 'visualizacoes', type: 'INT64' },
      { name: 'salvamentos', type: 'INT64' }, { name: 'compartilhamentos', type: 'INT64' }, { name: 'interacoes', type: 'INT64' },
      ...control,
    ],
  },
  instagram_conta_diaria: {
    name: 'instagram_conta_diaria',
    description: 'Números da conta por dia (do dia anterior à sincronização).',
    write: { kind: 'partition', dateColumn: 'data' },
    columns: [
      { name: 'data', type: 'DATE' }, { name: 'conta', type: 'STRING' },
      { name: 'alcance', type: 'INT64' }, { name: 'contas_engajadas', type: 'INT64' }, { name: 'interacoes', type: 'INT64' },
      { name: 'seguidores', type: 'INT64', description: 'Total no momento da sincronização' },
      { name: 'seguindo', type: 'INT64' }, { name: 'posts', type: 'INT64' },
      ...control,
    ],
  },
  facebook_posts: {
    name: 'facebook_posts',
    description: 'Posts das páginas do Facebook, com reações, comentários e compartilhamentos atuais.',
    write: { kind: 'merge', key: 'post_id' },
    columns: [
      { name: 'post_id', type: 'STRING' }, { name: 'pagina_id', type: 'STRING' }, { name: 'pagina', type: 'STRING' },
      { name: 'publicado_em', type: 'TIMESTAMP' }, { name: 'texto', type: 'STRING' }, { name: 'link', type: 'STRING' },
      { name: 'reacoes', type: 'INT64' }, { name: 'comentarios', type: 'INT64' }, { name: 'compartilhamentos', type: 'INT64' },
      ...control,
    ],
  },
  facebook_pagina_diaria: {
    name: 'facebook_pagina_diaria',
    description: 'Números de cada página por dia.',
    write: { kind: 'partition', dateColumn: 'data' },
    columns: [
      { name: 'data', type: 'DATE' }, { name: 'pagina_id', type: 'STRING' }, { name: 'pagina', type: 'STRING' },
      { name: 'seguidores', type: 'INT64' }, { name: 'novos_seguidores', type: 'INT64' }, { name: 'deixaram_de_seguir', type: 'INT64' },
      { name: 'visualizacoes', type: 'INT64' }, { name: 'visualizacoes_unicas', type: 'INT64' }, { name: 'engajamentos', type: 'INT64' },
      ...control,
    ],
  },
}

export type Row = Record<string, unknown>
/** What a source returns: rows per table, the new state to keep, and the day the partitions are for. */
export type Extracted = { rows: Record<string, Row[]>; state: Record<string, unknown>; warnings: string[] }
