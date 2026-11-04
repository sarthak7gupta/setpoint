/**
 * Pressure callout labels — thorough coverage of tennis edge cases.
 */
import { describe, expect, it } from 'vitest'
import { formatPressureLabel, getPressureSituation, simultaneousGamePoints } from './pressure'
import { dismissOverlay } from './scoring'
import {
  clearOverlay,
  freshSingles,
  reachSixAll,
  winGame,
  winPoint,
  winSetToLove,
} from './testHelpers'

/** Reach 5–3 with side a about to serve. */
function toFiveThreeAServing() {
  let s = freshSingles()
  for (const side of ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'a'] as const) {
    s = clearOverlay(winGame(s, side))
  }
  expect(s.sets[0].gamesA).toBe(5)
  expect(s.sets[0].gamesB).toBe(3)
  return s
}

/** Reach 5–4 a leading, b serving. */
function toFiveFourBServing() {
  let s = freshSingles()
  for (const side of ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'a', 'b'] as const) {
    s = clearOverlay(winGame(s, side))
  }
  expect(s.sets[0].gamesA).toBe(5)
  expect(s.sets[0].gamesB).toBe(4)
  return s
}

/** Reach 5–5, a serving. */
function toFiveAllAServing() {
  let s = freshSingles()
  for (const side of ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'a', 'b', 'b'] as const) {
    s = clearOverlay(winGame(s, side))
  }
  expect(s.sets[0].gamesA).toBe(5)
  expect(s.sets[0].gamesB).toBe(5)
  return s
}

describe('simultaneousGamePoints', () => {
  it('maps 40-0 / 40-15 / 40-30 / AD / deuce', () => {
    expect(simultaneousGamePoints(3, 0)).toBe(3)
    expect(simultaneousGamePoints(3, 1)).toBe(2)
    expect(simultaneousGamePoints(3, 2)).toBe(1)
    expect(simultaneousGamePoints(4, 3)).toBe(1)
    expect(simultaneousGamePoints(5, 4)).toBe(1)
    expect(simultaneousGamePoints(3, 3)).toBe(0)
    expect(simultaneousGamePoints(2, 1)).toBe(0)
    expect(simultaneousGamePoints(4, 4)).toBe(0)
    expect(simultaneousGamePoints(3, 3, true)).toBe(1)
  })
})

describe('formatPressureLabel', () => {
  it('uses a count on the first cluster, then ordinals after a save', () => {
    expect(
      formatPressureLabel({
        kind: 'break',
        simultaneous: 3,
        ordinal: 1,
        serverHasIt: false,
      }),
    ).toBe('3 break points')
    expect(
      formatPressureLabel({
        kind: 'break',
        simultaneous: 2,
        ordinal: 2,
        serverHasIt: false,
      }),
    ).toBe('Break point #2')
    expect(
      formatPressureLabel({
        kind: 'break',
        simultaneous: 1,
        ordinal: 3,
        serverHasIt: false,
      }),
    ).toBe('Break point #3')
    expect(
      formatPressureLabel({
        kind: 'match',
        simultaneous: 3,
        ordinal: 1,
        serverHasIt: true,
      }),
    ).toBe('3 match points')
    expect(
      formatPressureLabel({
        kind: 'match',
        simultaneous: 2,
        ordinal: 2,
        serverHasIt: true,
      }),
    ).toBe('Match point #2')
    expect(
      formatPressureLabel({
        kind: 'game',
        simultaneous: 1,
        ordinal: 8,
        serverHasIt: true,
      }),
    ).toBe('Game point #8')
  })
})

describe('regular game / break points', () => {
  it('0-40 → 3 break points', () => {
    let s = freshSingles()
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    const sit = getPressureSituation(s)!
    expect(sit.labels).toEqual(['3 break points'])
    expect(sit.simultaneous).toBe(3)
    expect(sit.isBreakPoint).toBe(true)
    expect(sit.isSetPoint).toBe(false)
  })

  it('0-40 → 3 break points, then #2 and #3 after saves', () => {
    let s = freshSingles()
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    let sit = getPressureSituation(s)!
    expect(sit.labels).toEqual(['3 break points'])
    expect(sit.breakOrdinal).toBe(1)

    s = winPoint(s, 'a') // 15-40
    sit = getPressureSituation(s)!
    expect(sit.labels).toEqual(['Break point #2'])
    expect(sit.breakOrdinal).toBe(2)

    s = winPoint(s, 'a') // 30-40
    sit = getPressureSituation(s)!
    expect(sit.labels).toEqual(['Break point #3'])
    expect(sit.breakOrdinal).toBe(3)
  })

  it('40-0 on serve → 3 game points (not serving-for-the-game)', () => {
    let s = freshSingles()
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    const sit = getPressureSituation(s)!
    expect(sit.labels[0]).toBe('3 game points')
    expect(sit.isBreakPoint).toBe(false)
    expect(sit.isSetPoint).toBe(false)
  })

  it('AD in after 40-0 on serve → Game point #4 (same side)', () => {
    let s = freshSingles()
    for (let i = 0; i < 3; i++) s = winPoint(s, 'a')
    for (let i = 0; i < 3; i++) s = winPoint(s, 'b')
    s = winPoint(s, 'a') // AD
    const sit = getPressureSituation(s)!
    expect(sit.simultaneous).toBe(1)
    // 40-0, 40-15, 40-30 were prior GPs for the server → ordinal 4
    expect(sit.gameOrdinal).toBe(4)
    expect(sit.labels).toEqual(['Game point #4'])
  })

  it("0-40 then deuce then AD in is the server's first game point, not #4", () => {
    let s = freshSingles()
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    s = winPoint(s, 'b') // 0-40
    let sit = getPressureSituation(s)!
    expect(sit.labels).toEqual(['3 break points'])
    expect(sit.labels.some((l) => /game/i.test(l))).toBe(false)

    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a') // deuce
    s = winPoint(s, 'a') // AD in
    sit = getPressureSituation(s)!
    expect(sit.isBreakPoint).toBe(false)
    expect(sit.gameOrdinal).toBe(1)
    expect(sit.labels).toEqual(['Game point'])
  })

  it('does not show game-point labels when a more specific callout applies', () => {
    let s = freshSingles()
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    expect(getPressureSituation(s)!.labels.some((l) => /game/i.test(l))).toBe(false)

    s = toFiveThreeAServing()
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    const setSit = getPressureSituation(s)!
    expect(setSit.labels).toEqual(['3 set points'])
    expect(setSit.labels.some((l) => /game/i.test(l))).toBe(false)

    s = toFiveFourBServing()
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    const both = getPressureSituation(s)!
    expect(both.labels).toEqual(['3 set points', '3 break points'])
    expect(both.labels.some((l) => /game/i.test(l))).toBe(false)
  })

  it('does not use match-wide game-point ordinals across sets', () => {
    // Play out a full love set so many GPs exist in set 1, then check set 2.
    let s = clearOverlay(winSetToLove(freshSingles(), 'a'))
    expect(s.sets[0].completed).toBe(true)
    s = clearOverlay(s)
    // Opening game of set 2 — first game point should be ordinal 1 (or small)
    s = winPoint(s, s.serverId === 'p1' ? 'a' : 'b')
    s = winPoint(s, s.serverId === 'p1' ? 'a' : 'b')
    s = winPoint(s, s.serverId === 'p1' ? 'a' : 'b')
    const sit = getPressureSituation(s)!
    expect(sit.primaryKind === 'game' || sit.primaryKind === 'break').toBe(true)
    expect(sit.gameOrdinal).toBe(1)
    expect(sit.labels[0]).not.toMatch(/#\d{2,}/)
  })

  it('no pressure at love-all', () => {
    expect(getPressureSituation(freshSingles())).toBeNull()
  })

  it('announces Deuce then Deuce #2 after returning from ad', () => {
    let s = freshSingles()
    for (let i = 0; i < 3; i++) s = winPoint(s, 'a')
    for (let i = 0; i < 3; i++) s = winPoint(s, 'b')
    let sit = getPressureSituation(s)!
    expect(sit.isDeuce).toBe(true)
    expect(sit.labels).toEqual(['Deuce'])
    expect(sit.deuceOrdinal).toBe(1)

    s = winPoint(s, 'a') // AD
    expect(getPressureSituation(s)?.isDeuce).toBeFalsy()

    s = winPoint(s, 'b') // back to deuce
    sit = getPressureSituation(s)!
    expect(sit.labels).toEqual(['Deuce #2'])
    expect(sit.deuceOrdinal).toBe(2)

    s = winPoint(s, 'b') // AD out
    s = winPoint(s, 'a') // deuce #3
    sit = getPressureSituation(s)!
    expect(sit.labels).toEqual(['Deuce #3'])
  })

  it('no-ad 40-40 is a deciding point, not deuce', () => {
    let s = freshSingles({ noAdScoring: true })
    for (let i = 0; i < 3; i++) s = winPoint(s, 'a')
    for (let i = 0; i < 3; i++) s = winPoint(s, 'b')
    const sit = getPressureSituation(s)!
    expect(sit.isDeuce).toBe(false)
    expect(sit.isGamePoint).toBe(true)
    expect(sit.isBreakPoint).toBe(true)
    expect(sit.labels).toEqual(['Deciding point'])
  })
})

describe('set points', () => {
  it('5-3, 40-0 on serve → 3 set points', () => {
    let s = toFiveThreeAServing()
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    const sit = getPressureSituation(s)!
    expect(sit.isSetPoint).toBe(true)
    expect(sit.labels[0]).toBe('3 set points')
    expect(sit.isMatchPoint).toBe(false)
  })

  it('5-3 love-all on serve → Serving for the set; in-game uses set-point ordinals', () => {
    let s = toFiveThreeAServing()
    expect(getPressureSituation(s)!.labels).toEqual(['Serving for the set'])

    for (let i = 0; i < 3; i++) s = winPoint(s, 'a')
    expect(getPressureSituation(s)!.labels[0]).toBe('3 set points')

    s = winPoint(s, 'b')
    expect(getPressureSituation(s)!.labels[0]).toBe('Set point #2')

    s = winPoint(s, 'b')
    expect(getPressureSituation(s)!.labels[0]).toBe('Set point #3')

    s = winPoint(s, 'b') // deuce
    s = winPoint(s, 'a') // AD
    const sit = getPressureSituation(s)!
    expect(sit.isSetPoint).toBe(true)
    expect(sit.labels[0]).toBe('Set point #4')
    expect(sit.labels[0]).not.toMatch(/Serving for/)
  })

  it('5-4 love-all on serve → Serving to stay in the set; vanishes after the first point', () => {
    let s = toFiveFourBServing()
    expect(getPressureSituation(s)!.labels).toEqual(['Serving to stay in the set'])
    expect(getPressureSituation(s)!.primaryKind).toBe('set')

    s = winPoint(s, 'b')
    expect(getPressureSituation(s)).toBeNull()
  })

  it('5-4, 0-40 on return → 3 set points + 3 break points', () => {
    let s = toFiveFourBServing()
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    const sit = getPressureSituation(s)!
    expect(sit.labels[0]).toBe('3 set points')
    expect(sit.labels).toContain('3 break points')
  })

  it('5-5 game point is NOT a set point', () => {
    let s = toFiveAllAServing()
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    const sit = getPressureSituation(s)!
    expect(sit.isSetPoint).toBe(false)
    expect(sit.isMatchPoint).toBe(false)
    expect(sit.labels[0]).toBe('3 game points')
  })
})

describe('match points', () => {
  it('best-of-1 5-4 love-all on serve → Serving to stay in the match', () => {
    let s = freshSingles({ bestOf: 1 })
    for (const side of ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'a', 'b'] as const) {
      s = clearOverlay(winGame(s, side))
    }
    expect(s.sets[0].gamesA).toBe(5)
    expect(s.sets[0].gamesB).toBe(4)
    const sit = getPressureSituation(s)!
    expect(sit.labels).toEqual(['Serving to stay in the match'])
    expect(sit.primaryKind).toBe('match')
    expect(sit.benefitingSide).toBe('a')
  })

  it('best-of-1 5-3 love-all on serve → Serving for the match', () => {
    let s = freshSingles({ bestOf: 1 })
    for (const side of ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'a'] as const) {
      s = clearOverlay(winGame(s, side))
    }
    expect(getPressureSituation(s)!.labels).toEqual(['Serving for the match'])
  })

  it('best-of-1 at 5-3 40-0 → 3 match points, then #2 / #3 after saves', () => {
    let s = freshSingles({ bestOf: 1 })
    for (const side of ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'a'] as const) {
      s = clearOverlay(winGame(s, side))
    }
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    expect(getPressureSituation(s)!.labels).toEqual(['3 match points'])

    s = winPoint(s, 'b')
    expect(getPressureSituation(s)!.labels).toEqual(['Match point #2'])

    s = winPoint(s, 'b')
    expect(getPressureSituation(s)!.labels).toEqual(['Match point #3'])
  })

  it('5-4 0-40 on return → 3 match/break points, then #2 then #3', () => {
    let s = freshSingles({ bestOf: 1 })
    for (const side of ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'a', 'b'] as const) {
      s = clearOverlay(winGame(s, side))
    }
    expect(s.sets[0].gamesA).toBe(5)
    expect(s.sets[0].gamesB).toBe(4)
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    let sit = getPressureSituation(s)!
    expect(sit.labels).toEqual(['3 match points', '3 break points'])

    s = winPoint(s, 'b')
    sit = getPressureSituation(s)!
    expect(sit.labels).toEqual(['Match point #2', 'Break point #2'])
    expect(sit.matchOrdinal).toBe(2)
    expect(sit.breakOrdinal).toBe(2)

    s = winPoint(s, 'b')
    sit = getPressureSituation(s)!
    expect(sit.labels).toEqual(['Match point #3', 'Break point #3'])
    expect(sit.matchOrdinal).toBe(3)
    expect(sit.breakOrdinal).toBe(3)
  })

  it('AD after saved match points uses Match point #N, not Serving for', () => {
    let s = freshSingles({ bestOf: 1 })
    for (const side of ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'a'] as const) {
      s = clearOverlay(winGame(s, side))
    }
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    s = winPoint(s, 'b') // deuce
    s = winPoint(s, 'a') // AD
    const sit = getPressureSituation(s)!
    expect(sit.isMatchPoint).toBe(true)
    expect(sit.labels[0]).toBe('Match point #4')
    expect(sit.labels[0]).not.toMatch(/Serving for/)
  })

  it('set 2 after winning set 1, 5-4 trailing serve → Serving to stay in the match', () => {
    let s = clearOverlay(winSetToLove(freshSingles(), 'a'))
    for (const side of ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'a', 'b'] as const) {
      s = clearOverlay(winGame(s, side))
    }
    expect(s.sets[1].gamesA).toBe(5)
    expect(s.sets[1].gamesB).toBe(4)
    expect(getPressureSituation(s)!.labels).toEqual(['Serving to stay in the match'])
  })

  it('set 2 after winning set 1 → match point, not mere set point', () => {
    let s = clearOverlay(winSetToLove(freshSingles(), 'a'))
    for (const side of ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'a'] as const) {
      s = clearOverlay(winGame(s, side))
    }
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    const sit = getPressureSituation(s)!
    expect(sit.isMatchPoint).toBe(true)
    expect(sit.labels[0]).toBe('3 match points')
  })
})

describe('tiebreak pressure', () => {
  it('6-5 in TB is set point; 6-6 is not', () => {
    let s = clearOverlay(reachSixAll(freshSingles()))
    // Start TB — next server already set; play to 6-5 for a
    expect(s.sets[0].isTiebreak).toBe(true)
    // Win 6 points for a, 5 for b without finishing
    for (let i = 0; i < 5; i++) {
      s = winPoint(s, 'a')
      if (s.pendingOverlay === 'changeover') s = dismissOverlay(s)
      s = winPoint(s, 'b')
      if (s.pendingOverlay === 'changeover') s = dismissOverlay(s)
    }
    s = winPoint(s, 'a')
    if (s.pendingOverlay === 'changeover') s = dismissOverlay(s)
    expect(s.sets[0].tiebreakPointsA).toBe(6)
    expect(s.sets[0].tiebreakPointsB).toBe(5)
    let sit = getPressureSituation(s)!
    expect(sit.isSetPoint).toBe(true)
    expect(sit.isBreakPoint).toBe(false)
    expect(sit.labels.some((l) => /break/i.test(l))).toBe(false)
    expect(sit.simultaneous).toBe(1)

    s = winPoint(s, 'b') // 6-6
    if (s.pendingOverlay === 'changeover') s = dismissOverlay(s)
    expect(s.sets[0].tiebreakPointsA).toBe(6)
    expect(s.sets[0].tiebreakPointsB).toBe(6)
    expect(getPressureSituation(s)).toBeNull()

    s = winPoint(s, 'a') // 7-6 — set point
    if (s.pendingOverlay === 'changeover') s = dismissOverlay(s)
    sit = getPressureSituation(s)!
    expect(sit.isSetPoint).toBe(true)
    expect(sit.isBreakPoint).toBe(false)
    expect(sit.labels.some((l) => /break/i.test(l))).toBe(false)
  })

  it('never stamps break-point flags on tiebreak points', () => {
    let s = clearOverlay(reachSixAll(freshSingles({ bestOf: 1 })))
    for (let i = 0; i < 5; i++) {
      s = winPoint(s, 'a')
      if (s.pendingOverlay === 'changeover') s = dismissOverlay(s)
      s = winPoint(s, 'b')
      if (s.pendingOverlay === 'changeover') s = dismissOverlay(s)
    }
    s = winPoint(s, 'a') // 6-5 — set/match point, possibly on return of serve
    if (s.pendingOverlay === 'changeover') s = dismissOverlay(s)
    const sit = getPressureSituation(s)!
    expect(sit.isMatchPoint || sit.isSetPoint).toBe(true)
    expect(sit.isBreakPoint).toBe(false)

    s = winPoint(s, 'a') // convert
    const last = s.events.at(-1)!
    expect(last.isBreakPoint).toBe(false)
  })
})

describe('advantage final set', () => {
  it('at 6-6 game point is NOT set point', () => {
    let s = freshSingles({
      bestOf: 3,
      finalSetTiebreak: false,
    })
    s = clearOverlay(winSetToLove(s, 'a'))
    s = clearOverlay(winSetToLove(s, 'b'))
    // Final set to 6-6 without TB
    for (let g = 0; g < 6; g++) {
      s = clearOverlay(winGame(s, 'a'))
      s = clearOverlay(winGame(s, 'b'))
    }
    expect(s.sets[2].gamesA).toBe(6)
    expect(s.sets[2].gamesB).toBe(6)
    expect(s.sets[2].isTiebreak).toBe(false)

    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    const sit = getPressureSituation(s)!
    expect(sit.isSetPoint).toBe(false)
    expect(sit.isMatchPoint).toBe(false)
    expect(sit.labels[0]).toBe('3 game points')
  })

  it('at 7-6 game point IS set/match point', () => {
    let s = freshSingles({
      bestOf: 3,
      finalSetTiebreak: false,
    })
    s = clearOverlay(winSetToLove(s, 'a'))
    s = clearOverlay(winSetToLove(s, 'b'))
    for (let g = 0; g < 6; g++) {
      s = clearOverlay(winGame(s, 'a'))
      s = clearOverlay(winGame(s, 'b'))
    }
    s = clearOverlay(winGame(s, 'a')) // 7-6
    expect(s.sets[2].gamesA).toBe(7)
    expect(s.sets[2].gamesB).toBe(6)
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    const sit = getPressureSituation(s)!
    expect(sit.isSetPoint).toBe(true)
    expect(sit.isMatchPoint).toBe(true)
    expect(sit.labels[0]).toBe('3 match points')
  })
})
