import { useCallback, useEffect, useRef, useState } from 'react'
import type { MatchConfig } from '../engine/types'
import { assertMatchConfig } from '../engine/validation'
import type { MatchRecord, PlayerRecord } from '../records'
import type { CommonSettings } from '../settings'
import { type CopiedMatchSetup, copiedMatchSetup } from '../utils/copiedMatchSetup'
import { canonicalPlayerId } from '../utils/players'

export type MatchSetup = CopiedMatchSetup & { selectedIds: (string | null)[] }
export function defaultMatchSetup(s: CommonSettings): MatchSetup {
  return {
    format: s.defaultFormat,
    names: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
    selectedIds: [null, null, null, null],
    bestOf: s.defaultBestOf,
    tiebreakPoints: s.defaultTiebreakPoints,
    finalSetTiebreak: s.defaultFinalSetTiebreak,
    finalSetTbPoints: s.defaultFinalSetTiebreakPoints,
    noAdScoring: s.defaultNoAdScoring,
    breakSec: s.defaultBreakSeconds,
    changeoverSec: s.defaultChangeoverSeconds,
    ballChangeEnabled: s.defaultBallChangeEnabled,
    ballChangeFirst: s.defaultBallChangeFirstGames,
    ballChangeEvery: s.defaultBallChangeEveryGames,
    ballChangeSec: s.defaultBallChangeSeconds,
    warmupEnabled: s.defaultWarmupEnabled,
    warmupSec: s.defaultWarmupSeconds,
    firstServerIndex: 0,
    firstReceiverIndex: 2,
    weather: s.defaultWeather,
    surface: s.defaultCourtSurface,
    notes: '',
  }
}
function normalize(s: MatchSetup): MatchSetup {
  if (s.format !== 'doubles') return s
  const receivers = s.firstServerIndex < 2 ? [2, 3] : [0, 1]
  return receivers.includes(s.firstReceiverIndex) ? s : { ...s, firstReceiverIndex: receivers[0] }
}
export function matchConfigFromSetup(s: MatchSetup, playerIds: string[]): MatchConfig {
  const config: MatchConfig = {
    format: s.format,
    bestOf: s.bestOf,
    tiebreakPoints: s.tiebreakPoints,
    finalSetTiebreak: s.finalSetTiebreak,
    finalSetTiebreakPoints: s.finalSetTbPoints,
    noAdScoring: s.noAdScoring,
    breakDurationSeconds: s.breakSec,
    changeoverDurationSeconds: s.changeoverSec,
    warmupEnabled: s.warmupEnabled,
    warmupDurationSeconds: s.warmupSec,
    ballChangeEnabled: s.ballChangeEnabled,
    ballChangeFirstGames: s.ballChangeFirst,
    ballChangeEveryGames: s.ballChangeEvery,
    ballChangeDurationSeconds: s.ballChangeSec,
    playerIds,
    firstServerId: playerIds[s.firstServerIndex],
    firstReceiverId: s.format === 'doubles' ? playerIds[s.firstReceiverIndex] : undefined,
  }
  assertMatchConfig(config)
  return config
}

export function useMatchSetup(settings: CommonSettings, ready: boolean) {
  const [setup, setSetup] = useState(() => defaultMatchSetup(settings))
  const dirty = useRef(new Set<keyof MatchSetup>())
  const hydrated = useRef(ready)
  useEffect(() => {
    if (!ready || hydrated.current) return
    hydrated.current = true
    setSetup((current) => {
      const defaults = defaultMatchSetup(settings)
      for (const key of dirty.current) Object.assign(defaults, { [key]: current[key] })
      return normalize(defaults)
    })
  }, [ready, settings])
  const setField = useCallback(
    <K extends keyof MatchSetup>(
      key: K,
      value: MatchSetup[K] | ((current: MatchSetup[K]) => MatchSetup[K]),
    ) => {
      dirty.current.add(key)
      setSetup((current) =>
        normalize({ ...current, [key]: typeof value === 'function' ? value(current[key]) : value }),
      )
    },
    [],
  )
  const setName = useCallback((index: number, name: string, id: string | null = null) => {
    dirty.current.add('names')
    dirty.current.add('selectedIds')
    setSetup((s) => ({
      ...s,
      names: s.names.map((n, i) => (i === index ? name : n)),
      selectedIds: s.selectedIds.map((v, i) => (i === index ? id : v)),
    }))
  }, [])
  const swapSlots = useCallback((from: number, to: number) => {
    for (const key of ['names', 'selectedIds', 'firstServerIndex', 'firstReceiverIndex'] as const)
      dirty.current.add(key)
    setSetup((s) => {
      const names = [...s.names],
        selectedIds = [...s.selectedIds]
      ;[names[from], names[to]] = [names[to], names[from]]
      ;[selectedIds[from], selectedIds[to]] = [selectedIds[to], selectedIds[from]]
      const move = (i: number) => (i === from ? to : i === to ? from : i)
      return normalize({
        ...s,
        names,
        selectedIds,
        firstServerIndex: move(s.firstServerIndex),
        firstReceiverIndex: move(s.firstReceiverIndex),
      })
    })
  }, [])
  const copySetup = useCallback((match: MatchRecord) => {
    const next = {
      ...copiedMatchSetup(match),
      selectedIds: [...match.config.playerIds, null, null].slice(0, 4),
    }
    Object.keys(next).forEach((key) => dirty.current.add(key as keyof MatchSetup))
    setSetup(normalize(next))
  }, [])
  return { setup, setField, setName, swapSlots, copySetup }
}

/** Validate the whole draft before creating any profiles. Selected people are not renamed. */
export async function createSetupLineup(
  setup: MatchSetup,
  profiles: PlayerRecord[],
  create: (name: string, id?: string) => Promise<PlayerRecord>,
) {
  const size = setup.format === 'singles' ? 2 : 4
  const names = setup.names.slice(0, size).map((name) => name.trim())
  if (names.some((name) => !name)) throw new Error('Player name required')
  const selected = setup.selectedIds
    .slice(0, size)
    .map((id) => (id ? canonicalPlayerId(id, profiles) : null))
  const ids = selected.map((id, i) => id ?? `new-slot-${i}`)
  matchConfigFromSetup(setup, ids)
  const players: PlayerRecord[] = []
  for (let i = 0; i < size; i++) {
    const existing = profiles.find((p) => p.id === selected[i])
    players.push(existing ?? (await create(names[i], selected[i] ?? undefined)))
  }
  return players
}
