// Instagram (professional account) through Composio. Per daily run, about 3–5 calls:
//  - the profile (followers, posts count) → 1 call;
//  - the posts WITH their metrics, 25–100 per call (field expansion "insights.metric(...)") → 1–2 calls;
//  - the account's numbers for the day before → 1 call (first run: the last 7 days, one call each).
import type { Caller } from '../composio.ts'
import { ActionError } from '../composio.ts'
import { daysAgo, startOfDay, today, yesterday } from '../dates.ts'
import type { Extracted, Row } from '../tables.ts'

export const instagramStreams = ['posts', 'conta'] as const
const POST_FIELDS = 'id,timestamp,media_type,media_product_type,caption,permalink,like_count,comments_count'
const POST_METRICS = 'reach,views,saved,shares,total_interactions'
/** Posts newer than this get their metrics refreshed every day; older ones barely change. */
const WINDOW_DAYS = 30
const MAX_POSTS = 1000

type Media = { id: string; timestamp?: string; media_type?: string; media_product_type?: string; caption?: string; permalink?: string; like_count?: number; comments_count?: number; insights?: { data?: { name: string; values?: { value: number }[] }[] } }
type Page = { data?: Media[]; paging?: { cursors?: { after?: string }; next?: string } }

export async function extractInstagram(api: Caller, opts: { streams: string[]; mode: 'incremental' | 'completo'; state: Record<string, unknown>; control: (raw: unknown) => Row }): Promise<Extracted> {
  const out: Extracted = { rows: {}, state: { ...opts.state }, warnings: [] }
  const profile = await api.run<{ id?: string; username?: string; followers_count?: number; follows_count?: number; media_count?: number }>(
    'INSTAGRAM_GET_USER_INFO', { fields: 'id,username,followers_count,follows_count,media_count' })
  const account = profile.username ?? profile.id ?? 'instagram'
  const userId = profile.id ?? 'me'

  if (opts.streams.includes('posts')) {
    // First load (or "completo"): every post, up to MAX_POSTS. Afterwards: only the window.
    const firstLoad = opts.mode === 'completo' || !opts.state.posts_carregados
    const since = firstLoad ? undefined : startOfDay(daysAgo(WINDOW_DAYS))
    const media = await listMedia(api, userId, since, out.warnings)
    const day = today()
    out.rows.instagram_posts = media.map(m => ({
      post_id: m.id, conta: account, publicado_em: m.timestamp ? new Date(m.timestamp).toISOString() : null,
      tipo: m.media_type ?? null, formato: m.media_product_type ?? null, legenda: m.caption ?? null, link: m.permalink ?? null,
      ...opts.control(withoutInsights(m)),
    }))
    out.rows.instagram_post_metricas = media.map(m => {
      const metric = (name: string) => m.insights?.data?.find(i => i.name === name)?.values?.[0]?.value ?? null
      return {
        data: day, post_id: m.id, conta: account, curtidas: m.like_count ?? null, comentarios: m.comments_count ?? null,
        alcance: metric('reach'), visualizacoes: metric('views'), salvamentos: metric('saved'), compartilhamentos: metric('shares'), interacoes: metric('total_interactions'),
        ...opts.control(m.insights ?? null),
      }
    })
    out.state.posts_carregados = true
  }

  if (opts.streams.includes('conta')) {
    // The day before (complete in Instagram). First run: the last 7 days.
    const done = typeof opts.state.conta_ate === 'string' ? opts.state.conta_ate : null
    const days: string[] = []
    for (let n = done ? 1 : 7; n >= 1; n--) { const d = daysAgo(n); if (!done || d > done) days.push(d) }
    const rows: Row[] = []
    for (const day of days.slice(-7)) {
      try {
        const r = await api.run<{ data?: { name: string; total_value?: { value: number } }[] }>('INSTAGRAM_GET_USER_INSIGHTS', {
          ig_user_id: userId, metric: ['reach', 'accounts_engaged', 'total_interactions'], period: 'day', metric_type: 'total_value',
          since: startOfDay(day), until: startOfDay(day) + 86_399,
        })
        const v = (name: string) => r.data?.find(x => x.name === name)?.total_value?.value ?? null
        const isLast = day === yesterday()
        rows.push({
          data: day, conta: account, alcance: v('reach'), contas_engajadas: v('accounts_engaged'), interacoes: v('total_interactions'),
          // The profile totals are "now": they label only the most recent day.
          seguidores: isLast ? profile.followers_count ?? null : null, seguindo: isLast ? profile.follows_count ?? null : null, posts: isLast ? profile.media_count ?? null : null,
          ...opts.control(r),
        })
      } catch (e) {
        if (!(e instanceof ActionError)) throw e
        out.warnings.push(`Números da conta de ${day}: ${e.message}`)
      }
    }
    out.rows.instagram_conta_diaria = rows
    if (rows.length) out.state.conta_ate = rows[rows.length - 1].data
  }
  return out
}

/** Posts with their metrics, page by page. If the metrics expansion is refused, retries without it. */
async function listMedia(api: Caller, userId: string, since: number | undefined, warnings: string[]): Promise<Media[]> {
  const all: Media[] = []
  let after: string | undefined
  let withInsights = true
  while (all.length < MAX_POSTS) {
    const args: Record<string, unknown> = { ig_user_id: userId, limit: 100, fields: withInsights ? `${POST_FIELDS},insights.metric(${POST_METRICS})` : POST_FIELDS }
    if (after) args.after = after
    if (since) args.since = since
    let page: Page
    try {
      page = await api.run<Page>('INSTAGRAM_GET_IG_USER_MEDIA', args)
    } catch (e) {
      // Some posts (e.g. very old ones or some formats) do not take every metric: the whole page fails.
      if (e instanceof ActionError && withInsights) { withInsights = false; warnings.push(`Métricas dos posts indisponíveis nesta página: ${e.message}`); continue }
      throw e
    }
    all.push(...(page.data ?? []))
    after = page.paging?.cursors?.after
    if (!after || !page.paging?.next || !page.data?.length) break
  }
  return all
}

const withoutInsights = ({ insights: _insights, ...rest }: Media) => rest
