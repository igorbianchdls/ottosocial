// Composio's REST API, the part the sync uses: running one read action on a workspace's connected account.
// Every call is counted (it is what Composio bills), so the sources ask for as much as possible per call.

const API = (process.env.COMPOSIO_API_URL || 'https://backend.composio.dev').replace(/\/$/, '')

export class ActionError extends Error {}

export type Caller = {
  /** Runs one action and returns its data; throws ActionError when the service refuses. */
  run: <T = Record<string, unknown>>(tool: string, args: Record<string, unknown>) => Promise<T>
  /** Calls made so far. */
  calls: () => number
}

export function composioCaller(opts: { apiKey: string; accountId: string; workspace: string }): Caller {
  let calls = 0
  return {
    calls: () => calls,
    async run<T>(tool: string, args: Record<string, unknown>): Promise<T> {
      calls++
      const res = await fetch(`${API}/api/v3.1/tools/execute/${encodeURIComponent(tool)}`, {
        method: 'POST',
        headers: { 'x-api-key': opts.apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({ connected_account_id: opts.accountId, user_id: opts.workspace, arguments: args }),
      })
      const text = await res.text()
      if (!res.ok) throw new ActionError(`${tool}: ${res.status} ${reason(text)}`)
      const body = JSON.parse(text) as { data?: unknown; error?: string | null; successful?: boolean }
      if (body.successful === false) throw new ActionError(`${tool}: ${body.error ?? 'falhou'}`)
      return (body.data ?? {}) as T
    },
  }
}

function reason(text: string) {
  try {
    const j = JSON.parse(text) as { error?: { message?: string } | string; message?: string }
    return (typeof j.error === 'object' ? j.error?.message : j.error) ?? j.message ?? text.slice(0, 300)
  } catch { return text.slice(0, 300) }
}
