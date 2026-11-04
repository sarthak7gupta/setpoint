import { describe, expect, it } from 'vitest'
import { shouldBallChangeAfterGames } from './ballChange'
import { dismissOverlay } from './scoring'
import { clearOverlay, freshSingles, reachSixAll, winGame, winPoint } from './testHelpers'

describe('shouldBallChangeAfterGames', () => {
  it('fires at 7, then every 9 (16, 25, …) — first 7 includes warm-up in the cycle', () => {
    expect(shouldBallChangeAfterGames(6, 7, 9)).toBe(false)
    expect(shouldBallChangeAfterGames(7, 7, 9)).toBe(true)
    expect(shouldBallChangeAfterGames(8, 7, 9)).toBe(false)
    expect(shouldBallChangeAfterGames(16, 7, 9)).toBe(true)
    expect(shouldBallChangeAfterGames(25, 7, 9)).toBe(true)
  })
})

describe('ball change overlay', () => {
  it('shows ball_change after the 7th game of the match', () => {
    let s = freshSingles()
    for (let g = 0; g < 6; g++) {
      s = clearOverlay(winGame(s, g % 2 === 0 ? 'a' : 'b'))
    }
    expect(s.gamesCompletedInMatch).toBe(6)
    s = winGame(s, 'a') // 7th
    expect(s.gamesCompletedInMatch).toBe(7)
    expect(s.pendingOverlay).toBe('ball_change')
  })

  it('skips the ball-change popup when that timer is 0', () => {
    let s = freshSingles({ ballChangeDurationSeconds: 0 })
    for (let g = 0; g < 6; g++) {
      s = clearOverlay(winGame(s, g % 2 === 0 ? 'a' : 'b'))
    }
    s = winGame(s, 'a')
    expect(s.gamesCompletedInMatch).toBe(7)
    expect(s.pendingOverlay).toBe('changeover')
  })

  it('skips ball-change and changeover when both timers are 0', () => {
    let s = freshSingles({ ballChangeDurationSeconds: 0, changeoverDurationSeconds: 0 })
    for (let g = 0; g < 6; g++) {
      s = clearOverlay(winGame(s, g % 2 === 0 ? 'a' : 'b'))
    }
    s = winGame(s, 'a')
    expect(s.pendingOverlay).toBe('none')
  })

  it('can be skipped like a changeover', () => {
    let s = freshSingles()
    for (let g = 0; g < 6; g++) {
      s = clearOverlay(winGame(s, g % 2 === 0 ? 'a' : 'b'))
    }
    s = winGame(s, 'a')
    expect(s.pendingOverlay).toBe('ball_change')
    s = clearOverlay(s)
    expect(s.pendingOverlay).toBe('none')
  })

  it('defers a change that falls on a tiebreak until after the set break', () => {
    // firstAt=12 → due when reaching 6-6, which starts the TB
    let s = freshSingles({ ballChangeFirstGames: 12, ballChangeEveryGames: 9 })
    s = reachSixAll(s)
    expect(s.gamesCompletedInMatch).toBe(12)
    expect(s.deferredBallChange).toBe(true)
    expect(s.pendingOverlay).not.toBe('ball_change')
    expect(s.sets[0].isTiebreak).toBe(true)

    s = clearOverlay(s)
    // Win TB 7-0 — inspect set_break before dismiss (dismiss promotes deferred ball change)
    for (let i = 0; i < 6; i++) {
      s = clearOverlay(winPoint(s, 'a'))
    }
    s = winPoint(s, 'a')
    expect(s.pendingOverlay).toBe('set_break')
    expect(s.deferredBallChange).toBe(true)
    expect(s.gamesCompletedInMatch).toBe(13)

    s = dismissOverlay(s)
    expect(s.pendingOverlay).toBe('ball_change')
    expect(s.deferredBallChange).toBe(false)
  })

  it('defers when the change is due on completing the tiebreak itself', () => {
    let s = freshSingles({ ballChangeFirstGames: 13, ballChangeEveryGames: 9 })
    s = reachSixAll(s)
    s = clearOverlay(s)
    for (let i = 0; i < 6; i++) {
      s = clearOverlay(winPoint(s, 'a'))
    }
    s = winPoint(s, 'a')
    expect(s.gamesCompletedInMatch).toBe(13)
    expect(s.pendingOverlay).toBe('set_break')
    expect(s.deferredBallChange).toBe(true)

    s = dismissOverlay(s)
    expect(s.pendingOverlay).toBe('ball_change')
  })
})
