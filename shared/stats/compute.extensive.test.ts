/**
 * Stats aggregation from point events (winners, serve %, return, streaks).
 */
import { describe, expect, it } from 'vitest'
import { applyFault, applyPoint, createMatch, dismissOverlay } from '../engine'
import type { MatchConfig, MatchMetadata } from '../engine/types'
import { computePlayerStats, computeSideStats } from './compute'

const meta: MatchMetadata = { date: '2026-08-31' }

const singles: MatchConfig = {
  format: 'singles',
  bestOf: 1,
  tiebreakPoints: 7,
  finalSetTiebreak: true,
  finalSetTiebreakPoints: 7,
  breakDurationSeconds: 60,
  changeoverDurationSeconds: 30,
  playerIds: ['p1', 'p2'],
  firstServerId: 'p1',
}

const doubles: MatchConfig = {
  format: 'doubles',
  bestOf: 1,
  tiebreakPoints: 7,
  finalSetTiebreak: true,
  finalSetTiebreakPoints: 7,
  breakDurationSeconds: 60,
  changeoverDurationSeconds: 30,
  playerIds: ['a1', 'a2', 'b1', 'b2'],
  firstServerId: 'a1',
  firstReceiverId: 'b1',
}

function clearOverlay(state: ReturnType<typeof createMatch>) {
  if (
    state.pendingOverlay === 'warmup' ||
    state.pendingOverlay === 'changeover' ||
    state.pendingOverlay === 'ball_change' ||
    state.pendingOverlay === 'set_break'
  ) {
    return dismissOverlay(state)
  }
  return state
}

function winGame(state: ReturnType<typeof createMatch>, side: 'a' | 'b') {
  let s = clearOverlay(state)
  for (let i = 0; i < 12; i++) {
    s = clearOverlay(s)
    const setIndex = s.sets.length - 1
    const gamesBefore = side === 'a' ? s.sets[setIndex].gamesA : s.sets[setIndex].gamesB
    const completedBefore = s.sets.filter((set) => set.completed).length
    s = applyPoint(s, { winnerSide: side, outcome: 'other' })
    const completedAfter = s.sets.filter((set) => set.completed).length
    if (
      completedAfter > completedBefore ||
      s.pendingOverlay === 'changeover' ||
      s.pendingOverlay === 'ball_change' ||
      s.pendingOverlay === 'set_break' ||
      s.pendingOverlay === 'match_end' ||
      s.isComplete
    ) {
      return s
    }
    const setAfter = s.sets[Math.min(setIndex, s.sets.length - 1)]
    const gamesAfter = side === 'a' ? setAfter.gamesA : setAfter.gamesB
    if (gamesAfter > gamesBefore) return s
  }
  return s
}

describe('computeSideStats / computePlayerStats', () => {
  it('returns empty zeros for a fresh match', () => {
    const s = createMatch(singles, meta)
    const sides = computeSideStats(s)
    expect(sides[0].winners).toBe(0)
    expect(sides[0].totalPointsWon).toBe(0)
    expect(sides[0].firstServeInPct).toBeNull()
  })

  it('counts aces, winners, and double faults on the serving side', () => {
    let s = createMatch(singles, meta)
    s = applyPoint(s, { winnerSide: 'a', outcome: 'ace' })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'winner' })
    s = applyFault(s)
    s = applyFault(s) // DF → b
    const a = computeSideStats(s).find((x) => x.side === 'a')!
    expect(a.aces).toBe(1)
    expect(a.winners).toBe(1)
    expect(a.doubleFaults).toBe(1)
  })

  it('tracks first-serve in vs second-serve points', () => {
    let s = createMatch(singles, meta)
    s = applyPoint(s, { winnerSide: 'a', outcome: 'winner' }) // 1st in
    s = applyFault(s)
    s = applyPoint(s, { winnerSide: 'a', outcome: 'winner' }) // 2nd serve point won
    const p1 = computePlayerStats(s).find((p) => p.playerId === 'p1')!
    expect(p1.firstServeAttempts).toBe(2)
    expect(p1.firstServesIn).toBe(1)
    expect(p1.firstServePointsWon).toBe(1)
    expect(p1.secondServePointsWon).toBe(1)
    expect(p1.secondServePointsTotal).toBe(1)
  })

  it('attributes optional doubles player for winners', () => {
    let s = createMatch(doubles, meta)
    s = applyPoint(s, {
      winnerSide: 'a',
      outcome: 'winner',
      attributedPlayerId: 'a2',
    })
    const stats = computePlayerStats(s)
    expect(stats.find((p) => p.playerId === 'a2')!.winners).toBe(1)
    expect(stats.find((p) => p.playerId === 'a1')!.winners).toBe(0)
  })

  it('credits unforced errors to attributed or opposing default player', () => {
    let s = createMatch(singles, meta)
    s = applyPoint(s, { winnerSide: 'a', outcome: 'unforced_error', attributedPlayerId: 'p2' })
    const p2 = computePlayerStats(s).find((p) => p.playerId === 'p2')!
    expect(p2.unforcedErrors).toBe(1)
  })

  it('computes max points in a row per side', () => {
    let s = createMatch(singles, meta)
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'b', outcome: 'other' })
    const a = computeSideStats(s).find((x) => x.side === 'a')!
    expect(a.maxPointsInARow).toBe(3)
    expect(a.totalPointsWon).toBe(3)
  })

  it('counts service games when a game is completed', () => {
    let s = createMatch(singles, meta)
    for (let i = 0; i < 4; i++) {
      s = applyPoint(s, { winnerSide: 'a', outcome: 'winner' })
    }
    const p1 = computePlayerStats(s).find((p) => p.playerId === 'p1')!
    expect(p1.serviceGamesWon).toBe(1)
    expect(p1.serviceGamesTotal).toBe(1)
  })

  it('formats break point ratios as fraction with percent in brackets', () => {
    let s = createMatch(singles, meta)
    // 0-40 on p1 serve, then p1 saves
    s = applyPoint(s, { winnerSide: 'b', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'b', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'b', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    const a = computeSideStats(s).find((x) => x.side === 'a')!
    expect(a.breakPointsSaved).toBe('1/1 (100%)')
  })

  it('omits percent when fraction total is zero', () => {
    const s = createMatch(singles, meta)
    const a = computeSideStats(s).find((x) => x.side === 'a')!
    expect(a.breakPointsSaved).toBe('0/0')
    expect(a.serviceGamesWon).toBe('0/0')
  })

  it('counts service games where server had game point but lost', () => {
    let s = createMatch(singles, meta)
    // 40-0 for server, then drop five in a row → broken from game point
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    for (let i = 0; i < 5; i++) s = applyPoint(s, { winnerSide: 'b', outcome: 'other' })
    const p1 = computePlayerStats(s).find((p) => p.playerId === 'p1')!
    expect(p1.gamePointsMissedOnServe).toBe(1)
    const a = computeSideStats(s).find((x) => x.side === 'a')!
    expect(a.gamePointsMissedOnServe).toBe(1)
  })

  it('counts return games where receiver had break point but lost', () => {
    let s = createMatch(singles, meta)
    // 0-40 break points, server saves all and holds
    s = applyPoint(s, { winnerSide: 'b', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'b', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'b', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    const p2 = computePlayerStats(s).find((p) => p.playerId === 'p2')!
    expect(p2.breakPointsMissedOnReturn).toBe(1)
  })

  it('counts sets where a side was two points from the set but lost it', () => {
    let s = createMatch(singles, meta)
    for (let g = 0; g < 5; g++) {
      s = winGame(s, 'a')
      s = clearOverlay(s)
    }
    expect(s.sets[0].gamesA).toBe(5)
    expect(s.sets[0].gamesB).toBe(0)

    // At 5-0 p2 serves; two points to a → 0-30 (exactly two from the set)
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    // b holds
    for (let i = 0; i < 5; i++) s = applyPoint(s, { winnerSide: 'b', outcome: 'other' })
    s = clearOverlay(s)

    let guard = 0
    while (!s.sets[0].completed && guard < 80) {
      guard += 1
      s = clearOverlay(s)
      if (s.sets[0].completed) break
      s = applyPoint(s, { winnerSide: 'b', outcome: 'other' })
    }
    expect(s.sets[0].completed).toBe(true)
    expect(s.sets[0].winner).toBe('b')
    const a = computeSideStats(s).find((x) => x.side === 'a')!
    expect(a.setsTwoPointsAwayLost).toBe(1)
    const b = computeSideStats(s).find((x) => x.side === 'b')!
    expect(b.setsTwoPointsAwayLost).toBe(0)
  })
})
