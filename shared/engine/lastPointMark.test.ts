import { describe, expect, it } from 'vitest'
import { lastPointMark } from './helpers'
import { clearOverlay, freshSingles, winGame, winPoint, winSetToLove } from './testHelpers'

describe('lastPointMark', () => {
  it('is empty before any point', () => {
    expect(lastPointMark(freshSingles())).toBeNull()
  })

  it('marks points while a game is in progress', () => {
    const s = winPoint(freshSingles(), 'a')
    expect(lastPointMark(s)).toEqual({ target: 'points', side: 'a' })
  })

  it('marks current-set games at 0-0 after a game', () => {
    const s = clearOverlay(winGame(freshSingles(), 'b'))
    expect(s.currentGame).toEqual({ pointsA: 0, pointsB: 0 })
    expect(lastPointMark(s)).toEqual({ target: 'set', side: 'b', setIndex: 0 })
  })

  it('marks the finished set when the next set is still 0-0', () => {
    let s = clearOverlay(winSetToLove(freshSingles({ bestOf: 3 }), 'a'))
    expect(s.sets[0].completed).toBe(true)
    expect(s.sets[1].gamesA + s.sets[1].gamesB).toBe(0)
    expect(s.currentGame).toEqual({ pointsA: 0, pointsB: 0 })
    expect(lastPointMark(s)).toEqual({ target: 'set', side: 'a', setIndex: 0 })
  })
})
