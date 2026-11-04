/**
 * Hides the HTML `#boot-splash` once settings and fonts are ready —
 * same gate as the Expo splash on native.
 */
import { type ReactNode, useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'

const FADE_MS = 320

function fontsAreReady(): boolean {
  if (typeof document === 'undefined') return true
  const fonts = document.fonts
  if (!fonts?.ready) return true
  return fonts.status === 'loaded'
}

export function BootSplashGate(args: { children: ReactNode }) {
  const { ready } = useApp()
  const [fontsReady, setFontsReady] = useState(fontsAreReady)
  const [appVisible, setAppVisible] = useState(false)

  useEffect(() => {
    if (fontsReady) return
    let cancelled = false
    const fonts = document.fonts
    if (!fonts?.ready) {
      setFontsReady(true)
      return
    }
    void fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [fontsReady])

  useEffect(() => {
    if (!ready || !fontsReady) return
    setAppVisible(true)
    const el = document.getElementById('boot-splash')
    if (!el) return
    el.classList.add('boot-splash--hide')
    el.setAttribute('aria-busy', 'false')
    const timer = window.setTimeout(() => {
      el.remove()
    }, FADE_MS)
    return () => window.clearTimeout(timer)
  }, [ready, fontsReady])

  if (!appVisible) return null
  return args.children
}
