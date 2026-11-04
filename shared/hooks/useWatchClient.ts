import { useEffect, useState } from 'react'
import { probeWatchUrl, type WatchSnapshot } from '../watch'

/** Poll sequentially; never let a prior source or older snapshot replace a score. */
export function useWatchClient(url: string | null) {
  const [view, setView] = useState<{
    url: string | null
    snapshot: WatchSnapshot | null
    status: 'connecting' | 'live' | 'lost'
  }>({ url: null, snapshot: null, status: 'connecting' })
  useEffect(() => {
    let cancelled = false
    let misses = 0
    let latest: WatchSnapshot | null = null
    let timer: ReturnType<typeof setTimeout>
    setView({ url, snapshot: null, status: 'connecting' })
    if (!url) return
    const tick = async () => {
      const hit = await probeWatchUrl(url, 2000, fetch)
      if (cancelled) return
      if (hit && (!latest || hit.snapshot.updatedAt >= latest.updatedAt)) {
        misses = 0
        latest = hit.snapshot
        setView({ url, snapshot: latest, status: 'live' })
      } else if (++misses >= 3) {
        setView({ url, snapshot: latest, status: 'lost' })
      }
      timer = setTimeout(() => void tick(), 500)
    }
    void tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [url])
  return view.url === url ? view : { snapshot: null, status: 'connecting' as const }
}
