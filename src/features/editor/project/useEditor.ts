'use client'

import { useCallback, useEffect, useReducer, useRef, useSyncExternalStore } from 'react'
import type { Project } from './types'

export const STORAGE_KEY = 'ottosocial-editor-v1'
const HISTORY_LIMIT = 100

type State = { past: Project[]; present: Project; future: Project[]; lastKey?: string }
type Action =
  | { type: 'apply'; fn: (p: Project) => Project; key?: string }
  | { type: 'transient'; project: Project }
  | { type: 'commit'; before: Project }
  | { type: 'undo' } | { type: 'redo' } | { type: 'load'; project: Project }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'apply': {
      const next = a.fn(s.present)
      if (next === s.present) return s
      // Typing in one field keeps one history entry instead of one per key.
      if (a.key && a.key === s.lastKey) return { ...s, present: next }
      return { past: [...s.past, s.present].slice(-HISTORY_LIMIT), present: next, future: [], lastKey: a.key }
    }
    case 'transient': return { ...s, present: a.project }
    case 'commit': return a.before === s.present ? s : { past: [...s.past, a.before].slice(-HISTORY_LIMIT), present: s.present, future: [], lastKey: undefined }
    case 'undo': return s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future], lastKey: undefined } : s
    case 'redo': return s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1), lastKey: undefined } : s
    case 'load': return { past: [], present: a.project, future: [] }
  }
}

export function readSaved(): Record<string, Project> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

/** Project state with undo/redo, saved in this browser until projects live in Supabase. */
/** `rebuild` makes the project on the client when it isn't saved yet (uploaded files only exist in this browser). */
export function useEditor(initial: Project, rebuild?: () => Project) {
  const [state, dispatch] = useReducer(reducer, { past: [], present: initial, future: [] })
  // Skips the save that runs in the same commit as the load, so it can't overwrite the saved copy.
  const skipSave = useRef(true)
  useEffect(() => {
    const saved = readSaved()[initial.id]
    if (saved) dispatch({ type: 'load', project: saved })
    else if (rebuild) dispatch({ type: 'load', project: rebuild() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id])
  useEffect(() => {
    if (skipSave.current) { skipSave.current = false; return }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSaved(), [state.present.id]: state.present })) } catch { /* storage blocked */ }
  }, [state.present])
  return {
    project: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    apply: useCallback((fn: (p: Project) => Project, key?: string) => dispatch({ type: 'apply', fn, key }), []),
    transient: useCallback((project: Project) => dispatch({ type: 'transient', project }), []),
    commit: useCallback((before: Project) => dispatch({ type: 'commit', before }), []),
    undo: useCallback(() => dispatch({ type: 'undo' }), []),
    redo: useCallback(() => dispatch({ type: 'redo' }), []),
  }
}

/** The playhead frame lives outside React state so playback only re-renders what shows the time. */
export function createFrameStore() {
  let frame = 0
  const listeners = new Set<() => void>()
  return {
    get: () => frame,
    set: (f: number) => { if (f !== frame) { frame = f; listeners.forEach(l => l()) } },
    subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } },
  }
}
export type FrameStore = ReturnType<typeof createFrameStore>
export const useFrame = (store: FrameStore) => useSyncExternalStore(store.subscribe, store.get, store.get)
