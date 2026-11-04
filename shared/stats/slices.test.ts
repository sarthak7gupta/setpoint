import { describe, expect, it } from 'vitest'
import { applyFault, applyPoint } from '../engine'
import { freshSingles, reachSixAll, winGame, winPoint } from '../engine/testHelpers'
import { computePlayerStats, computeSideStats } from './compute'
import { computePlayerSlice, computeSideSlice, displayPointSlice, tagEvents } from './slices'

describe('situational slices', () => {
  it('matches overall first-serve in% on the all filter', () => {
    let s = freshSingles({ bestOf: 1 })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'winner' })
    s = applyFault(s)
    s = applyPoint(s, { winnerSide: 'a', outcome: 'winner' })
    const overall = computePlayerStats(s).find((p) => p.playerId === 'p1')!
    const slice = computePlayerSlice({ state: s, playerId: 'p1', situation: 'all' })
    expect(slice.firstServeAttempts).toBe(overall.firstServeAttempts)
    expect(slice.firstServesIn).toBe(overall.firstServesIn)
    expect(displayPointSlice(slice).firstServeInPct).toBe(
      computeSideStats(s).find((x) => x.side === 'a')!.firstServeInPct,
    )
  })

  it('computes first-serve in% only on break points the server faces', () => {
    let s = freshSingles({ bestOf: 1 })
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    // 0–40, break point on p1 serve. First serve in, saved.
    s = applyPoint(s, { winnerSide: 'a', outcome: 'winner' })
    const bpServe = computePlayerSlice({
      state: s,
      playerId: 'p1',
      situation: 'breakPointServe',
    })
    expect(bpServe.firstServeAttempts).toBe(1)
    expect(bpServe.firstServesIn).toBe(1)
    expect(bpServe.servicePointsWon).toBe(1)
    expect(displayPointSlice(bpServe).firstServeInPct).toBe(100)

    const bpReturn = computePlayerSlice({
      state: s,
      playerId: 'p2',
      situation: 'breakPointReturn',
    })
    expect(bpReturn.returnPointsTotal).toBe(1)
    expect(bpReturn.returnPointsWon).toBe(0)
    expect(bpReturn.firstServeAttempts).toBe(0)
  })

  it('does not count love–15 as pressure', () => {
    let s = freshSingles({ bestOf: 1 })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'winner' })
    const pressure = computeSideSlice({ state: s, side: 'a', situation: 'pressure' })
    expect(pressure.pointsTotal).toBe(0)
    const all = computeSideSlice({ state: s, side: 'a', situation: 'all' })
    expect(all.pointsTotal).toBe(1)
  })

  it('counts 40–0 as a game point for the server', () => {
    let s = freshSingles({ bestOf: 1 })
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = applyPoint(s, { winnerSide: 'a', outcome: 'ace' })
    const gp = computePlayerSlice({ state: s, playerId: 'p1', situation: 'gamePoint' })
    expect(gp.firstServeAttempts).toBe(1)
    expect(gp.aces).toBe(1)
    expect(gp.servicePointsWon).toBe(1)
  })

  it('tags tiebreak points after 6–6', () => {
    let s = reachSixAll(freshSingles({ bestOf: 1, tiebreakPoints: 7, finalSetTiebreakPoints: 7 }))
    s = applyPoint(s, { winnerSide: 'a', outcome: 'winner' })
    const tagged = tagEvents(s)
    expect(tagged.some((row) => row.inTiebreak)).toBe(true)
    const tb = computeSideSlice({ state: s, side: 'a', situation: 'tiebreak' })
    expect(tb.pointsTotal).toBe(1)
    const last = tagged[tagged.length - 1]
    expect(last.inTiebreak).toBe(true)
    expect(last.event.isSetPoint).toBe(false)
    expect(last.event.isGamePoint).toBe(false)
  })

  it('isolates the final set in a best-of-3', () => {
    let s = freshSingles({ bestOf: 3 })
    s = winGame(s, 'a')
    const first = computeSideSlice({ state: s, side: 'a', situation: 'finalSet' })
    expect(first.pointsTotal).toBe(0)
    const all = computeSideSlice({ state: s, side: 'a', situation: 'all' })
    expect(all.pointsTotal).toBeGreaterThan(0)
  })
})

it('keeps explicitly attributed doubles partner shots in all-situation totals', async () => {
  const { freshDoubles } = await import('../engine/testHelpers')
  const state = applyPoint(freshDoubles(), {
    winnerSide: 'a',
    outcome: 'winner',
    attributedPlayerId: 'a2',
  })
  expect(computePlayerSlice({ state, playerId: 'a2', situation: 'all' }).winners).toBe(1)
  expect(computePlayerSlice({ state, playerId: 'a2', situation: 'all' }).firstServeAttempts).toBe(0)
})

it('tags the first tiebreak point after no-ad deciding games', async () => {
  const { clearOverlay } = await import('../engine/testHelpers')
  let state = freshSingles({ noAdScoring: true, bestOf: 1 })
  for (let game = 0; game < 12; game++) {
    const win = game % 2 === 0 ? 'a' : 'b',
      lose = win === 'a' ? 'b' : 'a'
    for (const side of [win, lose, win, lose, win, lose, win] as const)
      state = winPoint(clearOverlay(state), side)
  }
  state = winPoint(clearOverlay(state), 'a')
  expect(tagEvents(state).at(-1)?.inTiebreak).toBe(true)
  expect(computeSideSlice({ state, side: 'a', situation: 'tiebreak' }).pointsTotal).toBe(1)
})
