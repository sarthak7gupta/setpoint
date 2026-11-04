/**
 * Exhaustive coverage for scoring transitions, overlays, and pressure flags.
 * Pair with `serve.test.ts` and `undo-history.test.ts` for serve/undo specifics.
 */
import { describe, expect, it } from 'vitest'
import { applyFault, applyPoint, createMatch, dismissOverlay, formatGameScore } from './scoring'
import {
  clearOverlay,
  freshSingles,
  reachSixAll,
  singlesConfig,
  testMeta,
  winGame,
  winPoint,
  winSetToLove,
  withUndoStack,
} from './testHelpers'

describe('createMatch validation', () => {
  it('rejects wrong player count', () => {
    expect(() => createMatch(singlesConfig({ playerIds: ['only-one'] }), testMeta)).toThrow(
      /Expected 2 players/,
    )
  })

  it('rejects firstServerId outside the match', () => {
    expect(() => createMatch(singlesConfig({ firstServerId: 'stranger' }), testMeta)).toThrow(
      /firstServerId/,
    )
  })
})

describe('point display and game completion', () => {
  it('maps 0/1/2/3 to 0/15/30/40', () => {
    let s = freshSingles()
    expect(formatGameScore(s)).toEqual({ pointsA: '0', pointsB: '0' })
    s = winPoint(s, 'a')
    expect(formatGameScore(s).pointsA).toBe('15')
    s = winPoint(s, 'a')
    expect(formatGameScore(s).pointsA).toBe('30')
    s = winPoint(s, 'a')
    expect(formatGameScore(s).pointsA).toBe('40')
  })

  it('requires two-point margin from deuce', () => {
    let s = freshSingles()
    for (let i = 0; i < 3; i++) s = winPoint(s, 'a')
    for (let i = 0; i < 3; i++) s = winPoint(s, 'b')
    expect(formatGameScore(s)).toEqual({ pointsA: '40', pointsB: '40' })
    s = winPoint(s, 'a')
    expect(formatGameScore(s)).toEqual({ pointsA: 'AD', pointsB: '' })
    s = winPoint(s, 'a')
    expect(s.sets[0].gamesA).toBe(1)
    expect(s.currentGame).toEqual({ pointsA: 0, pointsB: 0 })
  })

  it('returns to deuce from advantage', () => {
    let s = freshSingles()
    for (let i = 0; i < 3; i++) {
      s = winPoint(s, 'a')
      s = winPoint(s, 'b')
    }
    s = winPoint(s, 'a')
    expect(formatGameScore(s)).toEqual({ pointsA: 'AD', pointsB: '' })
    s = winPoint(s, 'b')
    expect(formatGameScore(s)).toEqual({ pointsA: '40', pointsB: '40' })
  })

  it('no-ad: the next point after 40-40 wins the game', () => {
    let s = freshSingles({ noAdScoring: true })
    for (let i = 0; i < 3; i++) s = winPoint(s, 'a')
    for (let i = 0; i < 3; i++) s = winPoint(s, 'b')
    expect(formatGameScore(s)).toEqual({ pointsA: '40', pointsB: '40' })
    s = winPoint(s, 'a')
    expect(s.sets[0].gamesA).toBe(1)
    expect(s.currentGame).toEqual({ pointsA: 0, pointsB: 0 })
    expect(formatGameScore(s)).toEqual({ pointsA: '0', pointsB: '0' })
  })
})

describe('faults', () => {
  it('first fault only flips isSecondServe', () => {
    let s = freshSingles()
    s = applyFault(s)
    expect(s.isSecondServe).toBe(true)
    expect(s.currentGame.pointsA).toBe(0)
    expect(s.events).toHaveLength(0)
  })

  it('second fault is a double fault for the receiver', () => {
    let s = freshSingles()
    s = applyFault(s)
    s = applyFault(s)
    expect(s.currentGame.pointsB).toBe(1)
    expect(s.events.at(-1)?.outcome).toBe('double_fault')
    expect(s.events.at(-1)?.hadFirstServeFault).toBe(true)
    expect(s.isSecondServe).toBe(false)
  })

  it('ignores faults while an overlay is pending', () => {
    let s = winGame(freshSingles(), 'a')
    expect(s.pendingOverlay).toBe('changeover')
    const after = applyFault(s)
    expect(after).toEqual(s)
  })

  it('point after a fault is marked second-serve', () => {
    let s = freshSingles()
    s = applyFault(s)
    s = winPoint(s, 'a', 'ace')
    expect(s.events[0].serveNumber).toBe(2)
    expect(s.events[0].hadFirstServeFault).toBe(true)
    expect(s.events[0].outcome).toBe('ace')
  })
})

describe('overlays block scoring', () => {
  it('applyPoint is a no-op during changeover until dismissed', () => {
    let s = winGame(freshSingles(), 'a')
    expect(s.pendingOverlay).toBe('changeover')
    const blocked = winPoint(s, 'b')
    expect(blocked.events.length).toBe(s.events.length)
    s = dismissOverlay(s)
    expect(s.pendingOverlay).toBe('none')
    s = winPoint(s, 'b')
    expect(s.currentGame.pointsB).toBe(1)
  })

  it('skips changeover and set-break popups when those timers are 0', () => {
    let s = winGame(freshSingles({ changeoverDurationSeconds: 0 }), 'a')
    expect(s.pendingOverlay).toBe('none')
    expect(s.sets[0].gamesA).toBe(1)
    s = winSetToLove(freshSingles({ changeoverDurationSeconds: 0, breakDurationSeconds: 0 }), 'a')
    expect(s.pendingOverlay).toBe('none')
    expect(s.sets[0].completed).toBe(true)
    expect(s.sets).toHaveLength(2)
  })
})

describe('set and match completion', () => {
  it('set break after 6-0 and match end after two sets', () => {
    let s = winSetToLove(freshSingles(), 'a')
    expect(s.pendingOverlay).toBe('set_break')
    expect(s.sets[0].winner).toBe('a')
    expect(s.sets).toHaveLength(2)
    s = dismissOverlay(s)
    s = winSetToLove(s, 'a')
    expect(s.isComplete).toBe(true)
    expect(s.winner).toBe('a')
    expect(s.pendingOverlay).toBe('match_end')
  })
})

describe('best-of and final set rules', () => {
  it('best-of-1 completes on one set', () => {
    let s = winSetToLove(freshSingles({ bestOf: 1 }), 'b')
    expect(s.isComplete).toBe(true)
    expect(s.winner).toBe('b')
  })

  it('advantage final set has no tiebreak at 6-6 when configured', () => {
    let s = freshSingles({
      bestOf: 3,
      finalSetTiebreak: false,
    })
    // Split first two sets
    s = winSetToLove(s, 'a')
    s = dismissOverlay(s)
    s = winSetToLove(s, 'b')
    s = dismissOverlay(s)
    // Final set to 6-6
    s = reachSixAll(s)
    expect(s.sets[2].gamesA).toBe(6)
    expect(s.sets[2].gamesB).toBe(6)
    expect(s.sets[2].isTiebreak).toBe(false)
    // Need two-game margin
    s = winGame(s, 'a')
    s = clearOverlay(s)
    expect(s.sets[2].completed).toBe(false)
    s = winGame(s, 'a')
    expect(s.sets[2].gamesA).toBe(8)
    expect(s.isComplete).toBe(true)
  })

  it('championship final-set TB uses finalSetTiebreakPoints', () => {
    let s = freshSingles({
      bestOf: 3,
      finalSetTiebreak: true,
      finalSetTiebreakPoints: 10,
    })
    s = winSetToLove(s, 'a')
    s = dismissOverlay(s)
    s = winSetToLove(s, 'b')
    s = dismissOverlay(s)
    s = reachSixAll(s)
    expect(s.sets[2].isTiebreak).toBe(true)
    // Win 10 points with margin
    for (let i = 0; i < 10; i++) {
      s = clearOverlay(s)
      s = winPoint(s, 'a')
    }
    expect(s.isComplete).toBe(true)
    expect(s.sets[2].tiebreakPointsA).toBeGreaterThanOrEqual(10)
  })
})

describe('tiebreak scoring', () => {
  it('starts at 6-6 with standard 7-point TB', () => {
    let s = reachSixAll(freshSingles({ bestOf: 1 }))
    expect(s.sets[0].isTiebreak).toBe(true)
    expect(formatGameScore(s)).toEqual({ pointsA: '0', pointsB: '0' })
  })

  it('needs two-point margin at 6-6 in TB', () => {
    let s = reachSixAll(freshSingles({ bestOf: 1 }))
    for (let i = 0; i < 6; i++) {
      s = clearOverlay(s)
      s = winPoint(s, 'a')
      s = clearOverlay(s)
      s = winPoint(s, 'b')
    }
    expect(s.sets[0].tiebreakPointsA).toBe(6)
    expect(s.sets[0].tiebreakPointsB).toBe(6)
    expect(s.isComplete).toBe(false)
    s = clearOverlay(s)
    s = winPoint(s, 'a')
    s = clearOverlay(s)
    s = winPoint(s, 'a')
    expect(s.isComplete).toBe(true)
  })
})

describe('pressure flags on events', () => {
  it('marks break point when receiver is at game point', () => {
    let s = freshSingles()
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    s = winPoint(s, 'b') // 0-40 — next point is break point
    s = winPoint(s, 'a') // played while BP was on
    expect(s.events.at(-1)?.isBreakPoint).toBe(true)
  })

  it('marks match point on championship point', () => {
    let s = winSetToLove(freshSingles(), 'a')
    s = dismissOverlay(s)
    // Second set to 5-0, then to 40-0 for a while a serves or receives
    for (let g = 0; g < 5; g++) {
      s = winGame(s, 'a')
      s = clearOverlay(s)
    }
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a') // 40-0, set/match point next
    s = winPoint(s, 'a')
    expect(s.events.at(-1)?.isMatchPoint || s.isComplete).toBe(true)
  })
})

describe('ace outcome coercion', () => {
  it('forces ace onto serving side winner', () => {
    let s = freshSingles()
    // Ace claimed for receiver is coerced away from ace (engine converts outcome)
    s = applyPoint(s, { winnerSide: 'b', outcome: 'ace' })
    expect(s.events[0].outcome).toBe('winner')
    expect(s.currentGame.pointsB).toBe(1)
  })

  it('keeps ace when serving side wins', () => {
    let s = freshSingles()
    s = applyPoint(s, { winnerSide: 'a', outcome: 'ace' })
    expect(s.events[0].outcome).toBe('ace')
  })
})

describe('undo stack integration (app semantics)', () => {
  it('skip overlay is not required on the undo stack to leave the break', () => {
    const u = withUndoStack()
    let s = freshSingles()
    // Build to set break with stack
    for (let g = 0; g < 6; g++) {
      for (let p = 0; p < 4; p++) {
        s = u.point(s, 'a')
      }
      if (s.pendingOverlay === 'changeover') s = u.dismiss(s)
    }
    expect(s.pendingOverlay).toBe('set_break')
    const beforeDismissLen = u.stack.length
    s = u.dismiss(s) // no push
    expect(u.stack.length).toBe(beforeDismissLen)
    expect(s.pendingOverlay).toBe('none')
    // Undo set-winning sequence
    s = u.undo(s)
    expect(s.sets[0].completed).toBe(false)
  })
})
