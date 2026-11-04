/**
 * Serve / receive rotation for singles, doubles, and tiebreaks.
 */
import { describe, expect, it } from 'vitest'
import { shouldChangeoverAfterGame, shouldChangeoverInTiebreak } from './changeover'
import { buildServeOrder } from './helpers'
import { getServeInfo } from './scoring'
import { courtForPointIndex, isInTiebreak } from './serve'
import {
  clearOverlay,
  doublesConfig,
  freshDoubles,
  freshSingles,
  reachSixAll,
  winGame,
  winPoint,
} from './testHelpers'

describe('courtForPointIndex', () => {
  it('alternates deuce/ad', () => {
    expect(courtForPointIndex(0)).toBe('deuce')
    expect(courtForPointIndex(1)).toBe('ad')
    expect(courtForPointIndex(2)).toBe('deuce')
  })
})

describe('buildServeOrder', () => {
  it('singles is server then opponent', () => {
    const cfg = {
      format: 'singles' as const,
      bestOf: 3 as const,
      tiebreakPoints: 7,
      finalSetTiebreak: true,
      finalSetTiebreakPoints: 10,
      breakDurationSeconds: 90,
      changeoverDurationSeconds: 60,
      playerIds: ['p1', 'p2'],
      firstServerId: 'p2',
    }
    expect(buildServeOrder(cfg, 'p2')).toEqual(['p2', 'p1'])
  })

  it('doubles rotates A1, first receiver, A2, other receiver', () => {
    expect(buildServeOrder(doublesConfig(), 'a1', 'b1')).toEqual(['a1', 'b1', 'a2', 'b2'])
  })

  it('doubles with B serving first', () => {
    expect(
      buildServeOrder(doublesConfig({ firstServerId: 'b2', firstReceiverId: 'a1' }), 'b2', 'a1'),
    ).toEqual(['b2', 'a1', 'b1', 'a2'])
  })
})

describe('singles serve rotation', () => {
  it('alternates each game and tracks receiver court', () => {
    let s = freshSingles()
    expect(getServeInfo(s).serverId).toBe('p1')
    expect(getServeInfo(s).receiverCourt).toBe('deuce')
    s = winPoint(s, 'a')
    expect(getServeInfo(s).receiverCourt).toBe('ad')
    s = winGame(s, 'a')
    s = clearOverlay(s)
    expect(getServeInfo(s).serverId).toBe('p2')
    s = winGame(s, 'b')
    s = clearOverlay(s)
    expect(getServeInfo(s).serverId).toBe('p1')
  })
})

describe('doubles serve and receive', () => {
  it('cycles four servers', () => {
    let s = freshDoubles()
    const order = ['a1', 'b1', 'a2', 'b2']
    for (const expected of order) {
      expect(getServeInfo(s).serverId).toBe(expected)
      s = winGame(s, 'a')
      s = clearOverlay(s)
    }
    expect(getServeInfo(s).serverId).toBe('a1')
  })

  it('switches doubles receivers by deuce/ad court', () => {
    let s = freshDoubles()
    expect(getServeInfo(s).receiverId).toBe('b1')
    expect(getServeInfo(s).receiverCourt).toBe('deuce')
    s = winPoint(s, 'a')
    expect(getServeInfo(s).receiverId).toBe('b2')
    expect(getServeInfo(s).receiverCourt).toBe('ad')
    s = winPoint(s, 'a')
    expect(getServeInfo(s).receiverId).toBe('b1')
  })
})

describe('tiebreak serve pattern', () => {
  it('serves 1 then 2 alternately', () => {
    let s = reachSixAll(freshSingles({ bestOf: 1 }))
    expect(isInTiebreak(s)).toBe(true)
    const first = getServeInfo(s).serverId
    s = winPoint(s, 'a')
    s = clearOverlay(s)
    const second = getServeInfo(s).serverId
    expect(second).not.toBe(first)
    s = winPoint(s, 'a')
    s = clearOverlay(s)
    expect(getServeInfo(s).serverId).toBe(second)
    s = winPoint(s, 'b')
    s = clearOverlay(s)
    expect(getServeInfo(s).serverId).toBe(first)
  })

  it('doubles TB still rotates through serve order', () => {
    let s = reachSixAll(freshDoubles({ bestOf: 1 }))
    expect(isInTiebreak(s)).toBe(true)
    const seen = new Set<string>()
    for (let i = 0; i < 8; i++) {
      seen.add(getServeInfo(s).serverId)
      s = winPoint(s, i % 2 === 0 ? 'a' : 'b')
      s = clearOverlay(s)
    }
    expect(seen.size).toBeGreaterThanOrEqual(2)
  })
})

describe('changeover helpers', () => {
  it('after odd games only', () => {
    expect(shouldChangeoverAfterGame(0)).toBe(false)
    expect(shouldChangeoverAfterGame(1)).toBe(true)
    expect(shouldChangeoverAfterGame(2)).toBe(false)
    expect(shouldChangeoverAfterGame(3)).toBe(true)
  })

  it('every 6 TB points', () => {
    expect(shouldChangeoverInTiebreak(0)).toBe(false)
    expect(shouldChangeoverInTiebreak(6)).toBe(true)
    expect(shouldChangeoverInTiebreak(12)).toBe(true)
    expect(shouldChangeoverInTiebreak(5)).toBe(false)
  })
})

describe('serve continues across set break', () => {
  it('next set starts with next server in rotation', () => {
    let s = freshSingles()
    // 6-0: games served by p1,p2,p1,p2,p1,p2 — after 6th game advance to p1 for next set
    for (let g = 0; g < 6; g++) {
      s = winGame(s, 'a')
      if (s.pendingOverlay === 'changeover') s = clearOverlay(s)
    }
    expect(s.pendingOverlay).toBe('set_break')
    const nextServer = getServeInfo(s).serverId
    s = clearOverlay(s)
    expect(getServeInfo(s).serverId).toBe(nextServer)
    expect(s.sets).toHaveLength(2)
  })
})
