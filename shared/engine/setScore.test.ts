import { describe, expect, it } from 'vitest'
import {
  formatSetScore,
  tiebreakLoserPoints,
  tiebreakSuperscriptForSide,
  toSuperscriptDigits,
} from './setScore'
import type { SetScore } from './types'

function tbSet(partial: Partial<SetScore> & Pick<SetScore, 'winner'>): SetScore {
  return {
    gamesA: 7,
    gamesB: 6,
    isTiebreak: true,
    tiebreakPointsA: 7,
    tiebreakPointsB: 3,
    completed: true,
    ...partial,
  }
}

describe('tiebreak set score formatting', () => {
  it('puts loser’s TB points in superscript next to the 6', () => {
    expect(formatSetScore(tbSet({ winner: 'a', tiebreakPointsB: 8 }))).toBe('7-6⁸')
    expect(
      formatSetScore(
        tbSet({
          winner: 'b',
          gamesA: 6,
          gamesB: 7,
          tiebreakPointsA: 10,
          tiebreakPointsB: 12,
        }),
      ),
    ).toBe('6¹⁰-7')
  })

  it('leaves non-TB sets plain', () => {
    expect(
      formatSetScore({
        gamesA: 6,
        gamesB: 4,
        isTiebreak: false,
        tiebreakPointsA: 0,
        tiebreakPointsB: 0,
        completed: true,
        winner: 'a',
      }),
    ).toBe('6-4')
  })

  it('only annotates the losing side’s cell', () => {
    const set = tbSet({ winner: 'a', tiebreakPointsB: 4 })
    expect(tiebreakLoserPoints(set)).toBe(4)
    expect(tiebreakSuperscriptForSide(set, 'a')).toBeNull()
    expect(tiebreakSuperscriptForSide(set, 'b')).toBe(4)
  })

  it('maps multi-digit superscripts', () => {
    expect(toSuperscriptDigits(10)).toBe('¹⁰')
  })
})
