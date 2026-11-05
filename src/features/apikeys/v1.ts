import 'server-only'
import { isAdminNow, keyOwner, LIMITS, withinLimits, type KeyOwner, type Scope } from './server'

// Shared by the /api/v1 routes (the API agents call with an OttoSocial API key).
// Answers are JSON; errors are { erro: "…" } with the matching HTTP status.

export const ok = (body: unknown, status = 200) => Response.json(body, { status })
export const fail = (erro: string, status: number) => Response.json({ erro }, { status, headers: status === 429 ? { 'retry-after': '60' } : undefined })

const scopeText: Record<Scope, string> = { ler: 'ler', usar: 'usar os serviços conectados', agir: 'agir nos serviços (enviar, publicar, alterar ou apagar)', conectar: 'conectar serviços' }

/**
 * Runs a handler for a request with a valid key that has the scope. "conectar" also needs the key's
 * owner to be an admin of the workspace (as on the site).
 */
export async function withKey(request: Request, scope: Scope, handler: (owner: KeyOwner) => Promise<Response>, opts: { action?: boolean; anyScope?: boolean } = {}) {
  const owner = await keyOwner(request)
  if (!owner) return fail('Chave de API ausente, inválida ou revogada. Envie "Authorization: Bearer otto_sk_…".', 401)
  if (!opts.anyScope && !owner.scopes.includes(scope)) return fail(`Esta chave não tem permissão para ${scopeText[scope]}.`, 403)
  if (!await withinLimits(owner.keyId, opts.action)) {
    return fail(`Limite de uso da chave atingido (${LIMITS.perMinute} pedidos por minuto, ${LIMITS.perDay} por dia, ${LIMITS.actionsPerDay} ações por dia). Tente mais tarde.`, 429)
  }
  if (scope === 'conectar' && !await isAdminNow(owner.workspace, owner.userId)) return fail('Só administradores do workspace podem conectar ou desconectar serviços.', 403)
  try {
    return await handler(owner)
  } catch (e) {
    console.error('api v1: erro', e)
    return fail('Erro inesperado. Tente de novo.', 500)
  }
}
