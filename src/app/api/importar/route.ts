import type { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseConfigured } from '@/lib/supabase/env'
import { findReel, ImportError, isInstagramCdn } from '@/features/spaces/server/instagram'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 300 * 1024 * 1024
const fail = (error: string, status: number) => Response.json({ error }, { status })

/**
 * Downloads a public Instagram Reel. Body: { url }. Answers the MP4 itself (Instagram's CDN
 * doesn't allow the browser to fetch it directly), with the file name in X-Nome-Arquivo.
 */
export async function POST(request: NextRequest) {
  if (supabaseConfigured) {
    const { userId } = await auth()
    if (!userId) return fail('Entre na sua conta.', 401)
  }
  const body = await request.json().catch(() => ({})) as { url?: unknown }
  const link = typeof body.url === 'string' ? body.url : ''
  if (!link.trim()) return fail('Cole o link do Reel.', 400)

  let found
  try { found = await findReel(link) } catch (e) {
    if (e instanceof ImportError) return fail(e.message, 422)
    console.error('importar: erro inesperado', e)
    return fail('Não foi possível importar agora. Tente de novo em instantes.', 502)
  }

  const video = await fetch(found.videoUrl, { cache: 'no-store', signal: AbortSignal.timeout(45_000) }).catch(() => null)
  // Redirects must also stay on Instagram's CDN.
  if (!video?.ok || !video.body || !isInstagramCdn(video.url || found.videoUrl)) return fail('O Instagram não entregou o vídeo. Tente de novo em instantes.', 502)
  const size = Number(video.headers.get('content-length') ?? 0)
  if (size > MAX_BYTES) return fail('O vídeo passa de 300 MB.', 413)

  const name = `reel-${found.author ? `${found.author}-` : ''}${found.code}.mp4`
  return new Response(video.body, {
    headers: {
      'Content-Type': video.headers.get('content-type')?.startsWith('video/') ? video.headers.get('content-type')! : 'video/mp4',
      ...(size ? { 'Content-Length': String(size) } : {}),
      'Content-Disposition': `attachment; filename="${name}"`,
      'X-Nome-Arquivo': name,
      'Cache-Control': 'no-store',
    },
  })
}
