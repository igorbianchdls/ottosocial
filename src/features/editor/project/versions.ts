// Saved versions of a project, kept in this browser until projects live in Supabase.
import { localStamp, type Project } from './types'

const KEY = 'ottosocial-editor-versions-v1'
const LIMIT = 20
export type Version = { at: string; label: string; project: Project }

function readAll(): Record<string, Version[]> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
}

export const listVersions = (id: string): Version[] => readAll()[id] ?? []

export function saveVersion(p: Project, label: string): Version[] {
  const all = readAll()
  const list = [{ at: localStamp(), label, project: p }, ...(all[p.id] ?? [])].slice(0, LIMIT)
  try { localStorage.setItem(KEY, JSON.stringify({ ...all, [p.id]: list })) } catch { /* storage full or blocked */ }
  return list
}
