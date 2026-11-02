// Demo session until Supabase Auth (phase 2): remembers who signed in, in this browser only.
import { updateSettings } from '../settings/store'

const KEY = 'ottosocial-session-v1'
export type Session = { name: string; email: string; since: string }

export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

/** 0–4: length, letters and numbers, upper and lower case, symbol. */
export function passwordScore(v: string) {
  if (!v) return 0
  let score = v.length >= 8 ? 1 : 0
  if (v.length >= 8 && /\d/.test(v) && /[a-z]/i.test(v)) score++
  if (v.length >= 8 && /[a-z]/.test(v) && /[A-Z]/.test(v)) score++
  if (v.length >= 10 && /[^a-z0-9]/i.test(v)) score++
  return score
}
export const scoreLabel = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte']

export function signIn(s: Omit<Session, 'since'>, remember: boolean) {
  const data: Session = { ...s, since: new Date().toISOString() }
  try { (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(data)) } catch { /* storage blocked */ }
}
export function signOut() {
  try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY) } catch { /* storage blocked */ }
}

/** Account and workspace from the sign-up flow become the profile and workspace in Configurações. */
export function finishSignup(a: { name: string; email: string; workspace: string; role: string }) {
  signIn({ name: a.name, email: a.email }, true)
  updateSettings('profile', { name: a.name.split(' ')[0] || a.name, role: a.role })
  updateSettings('workspace', { name: a.workspace })
}
