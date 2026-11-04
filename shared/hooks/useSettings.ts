import { useCallback, useEffect, useRef, useState } from 'react'
import type { CommonSettings } from '../settings'

export function createUseSettings<T extends CommonSettings>(
  defaults: T,
  get: () => Promise<T>,
  save: (patch: Partial<T>) => Promise<T>,
) {
  return function useSettings() {
    const [settings, setSettings] = useState(defaults)
    const [ready, setReady] = useState(false)
    const [settingsStatus, setStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>(
      'loading',
    )
    const pending = useRef<Partial<T>>({})
    const version = useRef(0)
    const reloadSettings = useCallback(async () => {
      const token = ++version.current
      try {
        const loaded = await get()
        if (token === version.current) {
          setSettings(loaded)
          setStatus('saved')
        }
      } catch {
        if (token === version.current) setStatus('error')
      } finally {
        setReady(true)
      }
    }, [])
    useEffect(() => {
      void reloadSettings()
    }, [reloadSettings])
    const updateSettings = useCallback(async (patch: Partial<T>) => {
      pending.current = { ...pending.current, ...patch }
      const token = ++version.current
      setSettings((prev) => ({ ...prev, ...patch }))
      setStatus('saving')
      try {
        const loaded = await save(pending.current)
        if (token === version.current) {
          pending.current = {}
          setSettings(loaded)
          setStatus('saved')
        }
      } catch {
        if (token === version.current) setStatus('error')
      }
    }, [])
    const retrySettings = useCallback(() => updateSettings(pending.current), [updateSettings])
    return { settings, ready, settingsStatus, updateSettings, reloadSettings, retrySettings }
  }
}
