import { useEffect, useState } from 'react'
import type { MatchState, ThemeId } from '../engine'
import { buildWatchSnapshot } from '../watch'
import { publishWatchSnapshot, watchPublishAvailable } from '../watch/publish'

export function useWatchHost(args: {
  enabled: boolean
  matchId: string | undefined
  playerNames: Record<string, string> | undefined
  state: MatchState | null
  theme: ThemeId
}) {
  const [canPublish, setCanPublish] = useState(false)
  const [checked, setChecked] = useState(false)
  const [publishFailed, setPublishFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void watchPublishAvailable().then((ok) => {
      if (!cancelled) {
        setCanPublish(ok)
        setChecked(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!canPublish) return
    if (!args.enabled || !args.matchId || !args.playerNames || !args.state) {
      void publishWatchSnapshot(null)
      return
    }
    let cancelled = false
    const snapshot = buildWatchSnapshot({
      matchId: args.matchId,
      playerNames: args.playerNames,
      state: args.state,
      theme: args.theme,
    })
    const publish = () => {
      void publishWatchSnapshot(snapshot).then((ok) => {
        if (!cancelled) setPublishFailed(!ok)
      })
    }
    publish()
    const timer = setInterval(publish, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [args.enabled, args.matchId, args.playerNames, args.state, args.theme, canPublish])

  useEffect(() => {
    return () => {
      if (canPublish) void publishWatchSnapshot(null)
    }
  }, [canPublish])

  return { canPublish, checked, publishFailed }
}
