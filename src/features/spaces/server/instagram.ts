import 'server-only'

// Finds the MP4 of a public Instagram Reel (or video post) from its link. Instagram has no
// official API for other people's posts, so this tries, in order: the web app's GraphQL query,
// the embed page and the og:video tag. Any of them can stop working when Instagram changes.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const APP_ID = '936619743392459' // Instagram web app id, sent by instagram.com itself.
const DOC_ID = '8845758582119845' // PolarisPostActionLoadPostQueryByShortcode
const TIMEOUT = 15_000

export class ImportError extends Error {}

/** The shortcode in links like instagram.com/reel/ABC123/, /reels/, /p/ and /tv/. */
export function shortcodeOf(link: string): string | null {
  let u: URL
  try { u = new URL(link.trim()) } catch { return null }
  if (!/(^|\.)instagram\.com$|(^|\.)instagr\.am$/.test(u.hostname)) return null
  const m = u.pathname.match(/\/(?:reels?|p|tv)\/([A-Za-z0-9_-]{5,})/)
  return m ? m[1] : null
}

/** Only Instagram's own CDNs: the server never fetches an arbitrary address for the client. */
export function isInstagramCdn(url: string) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && /(^|\.)(cdninstagram\.com|fbcdn\.net)$/.test(u.hostname)
  } catch { return false }
}

const get = (url: string, init: RequestInit = {}) =>
  fetch(url, { ...init, redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT), headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', ...init.headers } })

/** JSON-escaped text from inside a page ("https:\/\/..." and "&") back to a plain URL. */
const unescape = (s: string) => { try { return JSON.parse(`"${s}"`) as string } catch { return s.replace(/\\\//g, '/').replace(/\\u0026/g, '&') } }
const unhtml = (s: string) => s.replace(/&amp;/g, '&').replace(/&#x2F;/gi, '/').replace(/&quot;/g, '"')

type Found = { videoUrl: string; author?: string }

async function viaGraphql(code: string): Promise<Found | null> {
  const lsd = 'AVqbxe3J_YA'
  const body = new URLSearchParams({
    lsd, doc_id: DOC_ID,
    variables: JSON.stringify({ shortcode: code, fetch_tagged_user_count: null, hoisted_comment_id: null, hoisted_reply_id: null }),
  })
  const res = await get('https://www.instagram.com/graphql/query', {
    method: 'POST', body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-IG-App-ID': APP_ID, 'X-FB-LSD': lsd, 'X-ASBD-ID': '129477', 'Sec-Fetch-Site': 'same-origin', Referer: `https://www.instagram.com/reel/${code}/` },
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => null) as { data?: { xdt_shortcode_media?: { video_url?: string; owner?: { username?: string } } | null } } | null
  const media = data?.data?.xdt_shortcode_media
  return media?.video_url ? { videoUrl: media.video_url, author: media.owner?.username } : null
}

async function viaEmbed(code: string): Promise<Found | null> {
  const res = await get(`https://www.instagram.com/p/${code}/embed/captioned/`)
  if (!res.ok) return null
  const html = await res.text()
  // The embed carries the post as JSON inside a string, so quotes can be escaped once or twice.
  const m = html.match(/\\*"video_url\\*"\s*:\s*\\*"([^"]+?)\\*"/)
  if (!m) return null
  let url = m[1]
  while (url.includes('\\')) { const next = unescape(url); if (next === url) break; url = next }
  const author = html.match(/\\*"username\\*"\s*:\s*\\*"([A-Za-z0-9._]+)\\*"/)?.[1]
  return { videoUrl: url, author }
}

async function viaOpenGraph(code: string): Promise<Found | null> {
  // Link previews get the og: tags without a login.
  const res = await get(`https://www.instagram.com/reel/${code}/`, { headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' } })
  if (!res.ok) return null
  const html = await res.text()
  const m = html.match(/<meta[^>]+property="og:video(?::secure_url)?"[^>]+content="([^"]+)"/) ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:video(?::secure_url)?"/)
  return m ? { videoUrl: unhtml(m[1]) } : null
}

/** Resolves the link to the video on Instagram's CDN. Throws ImportError with a message for people. */
export async function findReel(link: string): Promise<Found & { code: string }> {
  const code = shortcodeOf(link)
  if (!code) throw new ImportError('Cole um link de Reel do Instagram, como instagram.com/reel/…')
  for (const step of [viaGraphql, viaEmbed, viaOpenGraph]) {
    try {
      const found = await step(code)
      if (found && isInstagramCdn(found.videoUrl)) return { ...found, code }
    } catch (e) { console.warn(`importar: ${step.name} falhou`, e instanceof Error ? e.message : e) }
  }
  throw new ImportError('Não encontramos o vídeo. Confira se o link é de um Reel público (contas privadas não funcionam) e tente de novo.')
}
