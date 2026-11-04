import { describe, expect, it } from 'vitest'
import type { MatchConfig, MatchMetadata } from '../engine'
import { applyPoint, createMatch } from '../engine'
import { computeSideStats, formatFraction } from './compute'

describe('formatFraction', () => {
  it('includes percentage in brackets when total > 0', () => {
    expect(formatFraction(1, 2)).toBe('1/2 (50%)')
    expect(formatFraction(1, 3)).toBe('1/3 (33.3%)')
    expect(formatFraction(0, 4)).toBe('0/4 (0%)')
  })

  it('omits brackets when total is 0', () => {
    expect(formatFraction(0, 0)).toBe('0/0')
  })
})

const meta: MatchMetadata = { date: '2026-08-31' }
const config: MatchConfig = {
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

describe('computeSideStats', () => {
  it('counts aces winners and double faults', () => {
    let s = createMatch(config, meta)
    s = applyPoint(s, { winnerSide: 'a', outcome: 'ace' })
    s = applyPoint(s, { winnerSide: 'a', outcome: 'winner' })
    s = applyPoint(s, { winnerSide: 'b', outcome: 'double_fault' })
    // After DF server lost point - but DF outcome with winnerSide b from applyPoint path
    // Actually applyPoint with double_fault forces winner to receiving side if needed
    const stats = computeSideStats(s)
    const a = stats.find((x) => x.side === 'a')!
    const b = stats.find((x) => x.side === 'b')!
    expect(a.aces).toBe(1)
    expect(a.winners).toBe(1)
    expect(a.doubleFaults).toBe(1)
    expect(b.totalPointsWon).toBeGreaterThanOrEqual(1)
  })
})
