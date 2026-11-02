'use client'

import { useEffect } from 'react'
import { useSettings } from './store'

/** Applies the chosen theme and density to <html>; "sistema" follows the device. */
export function ThemeSync() {
  const { appearance } = useSettings()
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => { root.dataset.theme = appearance.theme === 'escuro' || (appearance.theme === 'sistema' && mq.matches) ? 'dark' : 'light' }
    apply()
    root.dataset.density = appearance.compact ? 'compact' : 'normal'
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [appearance.theme, appearance.compact])
  return null
}
