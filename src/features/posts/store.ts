'use client'

import { useCallback, useEffect, useState } from 'react'
import { initialPosts, type Post } from './data'

const KEY = 'ottosocial-posts-v1'

/** Posts live in localStorage until the backend (Supabase) is connected. */
export function usePosts() {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setPosts(JSON.parse(raw))
    } catch { /* keeps the sample data */ }
  }, [])
  const save = useCallback((next: Post[]) => {
    setPosts(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage full or blocked */ }
  }, [])
  return { posts, save }
}
