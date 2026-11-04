/**
 * Big-screen mode: try fullscreen + orientation lock on the tap, keep a CSS
 * landscape frame when the device stays portrait.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  enterBigScreenLandscape,
  exitBigScreenLandscape,
  isPortraitOrientation,
} from '../utils/bigScreenOrientation'

export function useBigScreenLandscape() {
  const [bigScreen, setBigScreen] = useState(false)
  const [portrait, setPortrait] = useState(() => isPortraitOrientation())

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(orientation: portrait)')
    const onChange = () => setPortrait(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!bigScreen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [bigScreen])

  useEffect(() => {
    return () => {
      void exitBigScreenLandscape()
    }
  }, [])

  const toggleBigScreen = useCallback(() => {
    setBigScreen((open) => {
      const next = !open
      // Must run in the same user-gesture turn as the tap for fullscreen/lock.
      if (next) void enterBigScreenLandscape()
      else void exitBigScreenLandscape()
      return next
    })
  }, [])

  const exitBigScreen = useCallback(() => {
    setBigScreen(false)
    void exitBigScreenLandscape()
  }, [])

  return {
    bigScreen,
    /** True when big screen is on but the device is still portrait — use CSS rotate. */
    forceLandscapeCss: bigScreen && portrait,
    toggleBigScreen,
    exitBigScreen,
    setBigScreen,
  }
}
