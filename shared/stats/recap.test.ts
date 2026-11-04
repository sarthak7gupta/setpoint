import { describe, expect, it } from 'vitest'
import { applyPoint } from '../engine/scoring'
import {
  clearOverlay,
  freshDoubles,
  freshSingles,
  reachSixAll,
  winGame,
  winPoint,
  winSetToLove,
} from '../engine/testHelpers'
import { buildMatchRecap, recapIsBreak, recapMarker } from './recap'

describe('recapMarker', () => {
  it('prefers MP over SP over BP', () => {
    const base = {
      id: 'e',
      winnerSide: 'a' as const,
      outcome: 'other' as const,
      serveNumber: 1 as const,
      hadFirstServeFault: false,
      serverId: 'p1',
      receiverId: 'p2',
      setIndex: 0,
      timestamp: 1,
      isBreakPoint: true,
      isGamePoint: true,
      isSetPoint: true,
      isMatchPoint: true,
    }
    expect(recapMarker(base, false)).toBe('MP')
    expect(recapMarker({ ...base, isMatchPoint: false }, true)).toBe('SP')
    expect(recapMarker({ ...base, isMatchPoint: false, isSetPoint: false }, false)).toBe('BP')
  })
})

describe('buildMatchRecap', () => {
  it('groups a love set into six games with running set score', () => {
    const s = winSetToLove(freshSingles({ bestOf: 1 }), 'a')
    const recap = buildMatchRecap(s)
    expect(recap).toHaveLength(1)
    expect(recap[0].games).toHaveLength(6)
    expect(recap[0].games.map((g) => `${g.gamesA}-${g.gamesB}`)).toEqual([
      '1-0',
      '2-0',
      '3-0',
      '4-0',
      '5-0',
      '6-0',
    ])
    expect(recap[0].games.every((g) => g.winner === 'a')).toBe(true)
    expect(recap[0].games[0].columns).toHaveLength(3)
    expect(recap[0].games[0].columns.map((c) => c.scoreA)).toEqual(['15', '30', '40'])
    expect(recap[0].games[5].columns.at(-1)?.marker).toBe('MP')
  })

  it('marks break points on a return game', () => {
    let s = freshSingles()
    s = clearOverlay(winGame(s, 'a'))
    // p2 serving; a returns to 0-40 (three points) then converts
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    const atBp = s.events.at(-1)
    expect(atBp?.isBreakPoint).toBe(false) // 0-30 was not yet 0-40
    s = winPoint(s, 'a')
    const recap = buildMatchRecap(s)
    const returnGame = recap[0].games[1]
    expect(returnGame.winner).toBe('a')
    expect(returnGame.serverId).toBe('p2')
    expect(returnGame.firstReceiverId).toBe('p1')
    expect(
      recapIsBreak({ state: s, serverId: returnGame.serverId, winner: returnGame.winner }),
    ).toBe(true)
    const marked = returnGame.columns.filter((c) => c.marker === 'BP')
    expect(marked.length).toBeGreaterThanOrEqual(1)
  })

  it('marks MP on championship point and SP in a tiebreak', () => {
    let s = freshSingles({ bestOf: 1 })
    s = clearOverlay(reachSixAll(s))
    expect(s.sets[0].isTiebreak).toBe(true)
    for (let i = 0; i < 6; i++) {
      s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
      if (s.pendingOverlay !== 'none') s = clearOverlay(s)
    }
    s = applyPoint(s, { winnerSide: 'a', outcome: 'other' })
    const recap = buildMatchRecap(s)
    const tb = recap[0].games.at(-1)!
    expect(tb.isTiebreak).toBe(true)
    expect(tb.columns.some((c) => c.marker === 'MP' || c.marker === 'SP')).toBe(true)
    expect(tb.columns.at(-1)?.scoreA).toBe('7')
  })

  it('records the receiver of each doubles point', () => {
    let s = freshDoubles({ bestOf: 1 })
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    const recap = buildMatchRecap(s)
    const game = recap[0].games[0]
    expect(game.firstReceiverId).toBe('b1')
    expect(game.columns.map((col) => col.receiverId)).toEqual(['b1', 'b2', 'b1'])
  })
})
