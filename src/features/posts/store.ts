'use client'

// Posts with create, edit, duplicate and reschedule. Kept in this browser until the backend (phase 3).
import { useSyncExternalStore } from 'react'
import { initialPosts, type Post } from './data'

const KEY = 'ottosocial-posts-v1'
let posts: Post[] = initialPosts
let loaded = false
const listeners = new Set<() => void>()

function ensure() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try { const raw = localStorage.getItem(KEY); if (raw) posts = JSON.parse(raw) } catch { /* keeps the sample data */ }
}
function commit(next: Post[]) {
  posts = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage full or blocked */ }
  listeners.forEach(l => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const getPosts = () => { ensure(); return posts }
const serverPosts = () => initialPosts

export const newPostId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
/** Local date and time as YYYY-MM-DDTHH:mm. */
export const nowStamp = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }

export const savePost = (p: Post) => { const list = getPosts(); commit(list.some(x => x.id === p.id) ? list.map(x => x.id === p.id ? p : x) : [...list, p]) }
export const deletePost = (id: string) => commit(getPosts().filter(p => p.id !== id))
export const restorePost = (p: Post) => commit([...getPosts().filter(x => x.id !== p.id), p])

/** Copy as a draft (no link, no metrics), so it can be edited and scheduled again. */
export function duplicatePost(id: string) {
  const src = getPosts().find(p => p.id === id)
  if (!src) return null
  const copy: Post = { ...src, id: newPostId(), status: 'rascunho', url: undefined, metrics: undefined, date: src.status === 'publicado' ? nowStamp() : src.date }
  commit([...getPosts(), copy])
  return copy.id
}

/** Moves a scheduled post or draft to another date/time. Published posts can't move. */
export function reschedule(id: string, date: string) {
  const p = getPosts().find(x => x.id === id)
  if (!p || p.status === 'publicado') return false
  commit(getPosts().map(x => x.id === id ? { ...x, date } : x))
  return true
}

/** All posts, shared by every screen that uses them. */
export function usePosts() {
  const list = useSyncExternalStore(subscribe, getPosts, serverPosts)
  return { posts: list, save: commit }
}
