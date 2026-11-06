// Facebook Pages through Composio. Per daily run, per page, about 2–3 calls:
//  - the pages the person manages → 1 call (shared);
//  - the posts with reactions, comments and shares counts (".summary(true)") → 1+ calls;
//  - the page's numbers for the day before → 1 call.
import type { Caller } from '../composio.ts'
import { ActionError } from '../composio.ts'
import { daysAgo, startOfDay, yesterday } from '../dates.ts'
import type { Extracted, Row } from '../tables.ts'

export const facebookStreams = ['posts', 'pagina'] as const
const MAX_PAGES = 5
const WINDOW_DAYS = 30
const POST_FIELDS = 'id,created_time,message,permalink_url,shares,reactions.summary(true).limit(0),comments.summary(true).limit(0)'
const PAGE_METRICS = 'page_follows,page_daily_follows_unique,page_daily_unfollows_unique,page_media_view,page_total_media_view_unique,page_post_engagements'

type FbPost = { id: string; created_time?: string; message?: string; permalink_url?: string; shares?: { count?: number }; reactions?: { summary?: { total_count?: number } }; comments?: { summary?: { total_count?: number } } }
type Insight = { name: string; values?: { value: number | Record<string, number>; end_time?: string }[] }

export async function extractFacebook(api: Caller, opts: { streams: string[]; mode: 'incremental' | 'completo'; state: Record<string, unknown>; control: (raw: unknown) => Row }): Promise<Extracted> {
  const out: Extracted = { rows: {}, state: { ...opts.state }, warnings: [] }
  const managed = await api.run<{ data?: { id: string; name?: string }[] }>('FACEBOOK_LIST_MANAGED_PAGES', { fields: 'id,name', limit: MAX_PAGES })
  const pages = (managed.data ?? []).slice(0, MAX_PAGES)
  if (!pages.length) out.warnings.push('Nenhuma página do Facebook encontrada nesta conta.')

  if (opts.streams.includes('posts')) {
    const firstLoad = opts.mode === 'completo' || !opts.state.posts_carregados
    const rows: Row[] = []
    for (const page of pages) {
      try {
        const r = await api.run<{ data?: FbPost[] }>('FACEBOOK_GET_PAGE_POSTS', {
          page_id: page.id, fields: POST_FIELDS, limit: 100, ...(firstLoad ? {} : { since: startOfDay(daysAgo(WINDOW_DAYS)) }),
        })
        for (const p of r.data ?? []) rows.push({
          post_id: p.id, pagina_id: page.id, pagina: page.name ?? null, publicado_em: p.created_time ? new Date(p.created_time).toISOString() : null,
          texto: p.message ?? null, link: p.permalink_url ?? null,
          reacoes: p.reactions?.summary?.total_count ?? null, comentarios: p.comments?.summary?.total_count ?? null, compartilhamentos: p.shares?.count ?? 0,
          ...opts.control(p),
        })
      } catch (e) {
        if (!(e instanceof ActionError)) throw e
        out.warnings.push(`Posts da página ${page.name ?? page.id}: ${e.message}`)
      }
    }
    out.rows.facebook_posts = rows
    out.state.posts_carregados = true
  }

  if (opts.streams.includes('pagina')) {
    const day = yesterday()
    const rows: Row[] = []
    for (const page of pages) {
      try {
        const r = await api.run<{ data?: Insight[] }>('FACEBOOK_GET_PAGE_INSIGHTS', {
          page_id: page.id, metrics: PAGE_METRICS, period: 'day', since: day, until: daysAgo(0),
        })
        const v = (name: string) => {
          const value = r.data?.find(i => i.name === name)?.values?.at(-1)?.value
          return typeof value === 'number' ? value : null
        }
        rows.push({
          data: day, pagina_id: page.id, pagina: page.name ?? null,
          seguidores: v('page_follows'), novos_seguidores: v('page_daily_follows_unique'), deixaram_de_seguir: v('page_daily_unfollows_unique'),
          visualizacoes: v('page_media_view'), visualizacoes_unicas: v('page_total_media_view_unique'), engajamentos: v('page_post_engagements'),
          ...opts.control(r),
        })
      } catch (e) {
        if (!(e instanceof ActionError)) throw e
        out.warnings.push(`Números da página ${page.name ?? page.id}: ${e.message}`)
      }
    }
    out.rows.facebook_pagina_diaria = rows
  }
  return out
}
