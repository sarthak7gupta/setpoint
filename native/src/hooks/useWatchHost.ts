import { useEffect, useState } from 'react'
import type { MatchState, ThemeId } from '../engine'
import { buildWatchSnapshot } from '../watch'
import {
  setWatchHostSnapshot,
  startWatchServer,
  stopWatchServer,
  watchHostNativeAvailable,
} from '../watch/host'
import { nativeLocalIpv4 } from '../watch/localIp'

export function useWatchHost(args: {
  enabled: boolean
  matchId: string | undefined
  playerNames: Record<string, string> | undefined
  state: MatchState | null
  theme: ThemeId
}) {
  const available = watchHostNativeAvailable()
  const [listenOk, setListenOk] = useState(false)
  const [address, setAddress] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void nativeLocalIpv4().then((ip) => {
      if (!cancelled && ip) setAddress(ip)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!args.enabled || !available) {
      setWatchHostSnapshot(null)
      if (!args.enabled) stopWatchServer()
      setListenOk(false)
      return
    }
    let cancelled = false
    void startWatchServer().then((result) => {
      if (!cancelled) setListenOk(result === 'ok')
    })
    return () => {
      cancelled = true
    }
  }, [args.enabled, available])

  useEffect(() => {
    if (!args.enabled || !listenOk || !args.matchId || !args.playerNames || !args.state) {
      setWatchHostSnapshot(null)
      return
    }
    setWatchHostSnapshot(
      buildWatchSnapshot({
        matchId: args.matchId,
        playerNames: args.playerNames,
        state: args.state,
        theme: args.theme,
      }),
    )
  }, [args.enabled, args.matchId, args.playerNames, args.state, args.theme, listenOk])

  useEffect(() => {
    return () => {
      setWatchHostSnapshot(null)
      stopWatchServer()
    }
  }, [])

  return { available, listenOk, address }
}
