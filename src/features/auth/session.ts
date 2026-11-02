'use client'

import { supabase } from '@/lib/supabase/client'
import { supabaseConfigured } from '@/lib/supabase/env'

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

/** Supabase Auth errors, in words people understand. */
export function authMessage(e: { message?: string; code?: string; status?: number } | null | undefined) {
  if (!e) return ''
  const code = e.code ?? ''
  const msg = (e.message ?? '').toLowerCase()
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'E-mail ou senha incorretos.'
  if (code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar. Procure o link que enviamos (veja também o spam).'
  if (code === 'user_already_exists' || msg.includes('already registered')) return 'Já existe uma conta com este e-mail. Entre ou recupere a senha.'
  if (code === 'email_address_invalid') return 'Este e-mail não é aceito. Use um e-mail real que você acessa.'
  if (code === 'email_address_not_authorized') return 'Ainda não conseguimos enviar e-mail para este endereço. Fale com o suporte.'
  if (code === 'weak_password') return 'Senha fraca demais. Use letras, números e pelo menos 8 caracteres.'
  if (code === 'same_password') return 'A senha nova precisa ser diferente da atual.'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || e.status === 429) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
  if (msg.includes('fetch') || msg.includes('network')) return 'Sem conexão com o servidor. Confira sua internet.'
  return 'Não deu certo agora. Tente de novo em instantes.'
}

/** Where Supabase e-mail links come back to (confirm sign-up, reset password). */
export const callbackUrl = (next: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

export async function signOut() {
  if (supabaseConfigured) await supabase().auth.signOut()
  // A full page load drops every in-memory store and lets the proxy see the cleared cookies.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload is the point
  window.location.assign('/login')
}
