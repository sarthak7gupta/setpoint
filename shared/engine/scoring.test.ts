import { describe, expect, it } from 'vitest'
import { isChangeover } from './changeover'
import {
  applyFault,
  applyPoint,
  createMatch,
  dismissOverlay,
  formatGameScore,
  getServeInfo,
} from './scoring'
import type { MatchConfig, MatchMetadata, MatchState, PointOutcome } from './types'

const meta: MatchMetadata = { date: '2026-08-31', courtSurface: 'grass' }

function singlesConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    format: 'singles',
    bestOf: 3,
    tiebreakPoints: 7,
    finalSetTiebreak: true,
    finalSetTiebreakPoints: 10,
    breakDurationSeconds: 120,
    changeoverDurationSeconds: 90,
    playerIds: ['p1', 'p2'],
    firstServerId: 'p1',
    ...overrides,
  }
}

function doublesConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    format: 'doubles',
    bestOf: 3,
    tiebreakPoints: 7,
    finalSetTiebreak: true,
    finalSetTiebreakPoints: 10,
    breakDurationSeconds: 120,
    changeoverDurationSeconds: 90,
    playerIds: ['a1', 'a2', 'b1', 'b2'],
    firstServerId: 'a1',
    firstReceiverId: 'b1',
    ...overrides,
  }
}

function winPoint(state: MatchState, side: 'a' | 'b', outcome: PointOutcome = 'winner') {
  return applyPoint(state, { winnerSide: side, outcome })
}

function winGame(state: MatchState, side: 'a' | 'b'): MatchState {
  let s = state
  for (let i = 0; i < 10; i++) {
    if (s.pendingOverlay !== 'none' && s.pendingOverlay !== 'match_end') {
      s = dismissOverlay(s)
    }
    const setIndex = s.sets.length - 1
    const setGamesBefore = side === 'a' ? s.sets[setIndex].gamesA : s.sets[setIndex].gamesB
    const completedSetsBefore = s.sets.filter((set) => set.completed).length
    s = winPoint(s, side)
    const setIndexAfter = Math.min(setIndex, s.sets.length - 1)
    const setGamesAfter = s.sets[setIndexAfter]?.completed
      ? side === 'a'
        ? s.sets[setIndexAfter].gamesA
        : s.sets[setIndexAfter].gamesB
      : side === 'a'
        ? s.sets[s.sets.length - 1].gamesA
        : s.sets[s.sets.length - 1].gamesB
    const completedSetsAfter = s.sets.filter((set) => set.completed).length
    if (
      setGamesAfter > setGamesBefore ||
      completedSetsAfter > completedSetsBefore ||
      s.isComplete ||
      s.pendingOverlay === 'changeover' ||
      s.pendingOverlay === 'set_break' ||
      s.pendingOverlay === 'match_end'
    ) {
      return s
    }
  }
  return s
}

describe('createMatch', () => {
  it('sets first server and receiver for singles', () => {
    const m = createMatch(singlesConfig(), meta)
    const serve = getServeInfo(m)
    expect(serve.serverId).toBe('p1')
    expect(serve.receiverId).toBe('p2')
    expect(serve.receiverCourt).toBe('deuce')
  })

  it('builds doubles serve order a1,b1,a2,b2', () => {
    const m = createMatch(doublesConfig(), meta)
    expect(m.serveOrder).toEqual(['a1', 'b1', 'a2', 'b2'])
    expect(getServeInfo(m).serverId).toBe('a1')
    expect(getServeInfo(m).receiverId).toBe('b1')
  })
})

describe('point and game scoring', () => {
  it('progresses 0-15-30-40-game', () => {
    let s = createMatch(singlesConfig(), meta)
    s = winPoint(s, 'a')
    expect(formatGameScore(s).pointsA).toBe('15')
    s = winPoint(s, 'a')
    expect(formatGameScore(s).pointsA).toBe('30')
    s = winPoint(s, 'a')
    expect(formatGameScore(s).pointsA).toBe('40')
    s = winPoint(s, 'a')
    expect(s.sets[0].gamesA).toBe(1)
    expect(s.currentGame.pointsA).toBe(0)
  })

  it('handles deuce and advantage', () => {
    let s = createMatch(singlesConfig(), meta)
    // 40-40
    for (let i = 0; i < 3; i++) s = winPoint(s, 'a')
    for (let i = 0; i < 3; i++) s = winPoint(s, 'b')
    expect(formatGameScore(s)).toEqual({ pointsA: '40', pointsB: '40' })
    s = winPoint(s, 'a')
    expect(formatGameScore(s)).toEqual({ pointsA: 'AD', pointsB: '' })
    s = winPoint(s, 'b')
    expect(formatGameScore(s)).toEqual({ pointsA: '40', pointsB: '40' })
    s = winPoint(s, 'b')
    expect(formatGameScore(s)).toEqual({ pointsA: '', pointsB: 'AD' })
    s = winPoint(s, 'b')
    expect(s.sets[0].gamesB).toBe(1)
  })
})

describe('serve rotation', () => {
  it('alternates server each game in singles', () => {
    let s = createMatch(singlesConfig(), meta)
    expect(getServeInfo(s).serverId).toBe('p1')
    s = winGame(s, 'a')
    if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
    expect(getServeInfo(s).serverId).toBe('p2')
    s = winGame(s, 'a')
    if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
    expect(getServeInfo(s).serverId).toBe('p1')
  })

  it('rotates four servers in doubles', () => {
    let s = createMatch(doublesConfig(), meta)
    expect(getServeInfo(s).serverId).toBe('a1')
    s = winGame(s, 'a')
    if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
    expect(getServeInfo(s).serverId).toBe('b1')
    s = winGame(s, 'b')
    if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
    expect(getServeInfo(s).serverId).toBe('a2')
    s = winGame(s, 'a')
    if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
    expect(getServeInfo(s).serverId).toBe('b2')
  })

  it('switches receiver court each point', () => {
    let s = createMatch(singlesConfig(), meta)
    expect(getServeInfo(s).receiverCourt).toBe('deuce')
    s = winPoint(s, 'a')
    expect(getServeInfo(s).receiverCourt).toBe('ad')
    s = winPoint(s, 'b')
    expect(getServeInfo(s).receiverCourt).toBe('deuce')
  })

  it('switches doubles receivers by court', () => {
    let s = createMatch(doublesConfig(), meta)
    expect(getServeInfo(s).receiverId).toBe('b1')
    s = winPoint(s, 'a')
    expect(getServeInfo(s).receiverId).toBe('b2')
    expect(getServeInfo(s).receiverCourt).toBe('ad')
  })
})

describe('faults', () => {
  it('marks second serve after fault', () => {
    let s = createMatch(singlesConfig(), meta)
    s = applyFault(s)
    expect(s.isSecondServe).toBe(true)
    expect(getServeInfo(s).isSecondServe).toBe(true)
  })

  it('double fault awards point to receiver', () => {
    let s = createMatch(singlesConfig(), meta)
    s = applyFault(s)
    s = applyFault(s)
    expect(s.currentGame.pointsB).toBe(1)
    expect(s.events.at(-1)?.outcome).toBe('double_fault')
    expect(s.isSecondServe).toBe(false)
  })
})

describe('changeovers', () => {
  it('flags changeover after odd games', () => {
    let s = createMatch(singlesConfig(), meta)
    s = winGame(s, 'a')
    expect(s.pendingOverlay).toBe('changeover')
    expect(isChangeover({ ...s, pendingOverlay: 'none' }) || s.gamesCompletedInSet % 2 === 1).toBe(
      true,
    )
    s = dismissOverlay(s)
    s = winGame(s, 'a')
    expect(s.pendingOverlay).toBe('none')
  })
})

describe('tiebreak', () => {
  it('starts at 6-6 and uses 1-then-2 serve pattern', () => {
    let s = createMatch(singlesConfig({ bestOf: 1 }), meta)
    // Reach 6-6
    for (let g = 0; g < 6; g++) {
      s = winGame(s, 'a')
      if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
      s = winGame(s, 'b')
      if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
    }
    expect(s.sets[0].gamesA).toBe(6)
    expect(s.sets[0].gamesB).toBe(6)
    expect(s.sets[0].isTiebreak).toBe(true)

    // First TB point: one server
    const firstServer = getServeInfo(s).serverId
    s = winPoint(s, 'a')
    if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
    const secondServer = getServeInfo(s).serverId
    expect(secondServer).not.toBe(firstServer)

    // Next two points same server
    s = winPoint(s, 'a')
    if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
    expect(getServeInfo(s).serverId).toBe(secondServer)
    s = winPoint(s, 'b')
    if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
    expect(getServeInfo(s).serverId).toBe(firstServer)
  })

  it('changeover every 6 tiebreak points', () => {
    let s = createMatch(singlesConfig({ bestOf: 1 }), meta)
    for (let g = 0; g < 6; g++) {
      s = winGame(s, 'a')
      if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
      s = winGame(s, 'b')
      if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
    }
    for (let i = 0; i < 6; i++) {
      s = winPoint(s, i % 2 === 0 ? 'a' : 'b')
      if (i < 5 && s.pendingOverlay === 'changeover') s = dismissOverlay(s)
    }
    expect(s.pendingOverlay).toBe('changeover')
  })
})

describe('set and match', () => {
  it('completes a set at 6-4 and shows set break', () => {
    let s = createMatch(singlesConfig(), meta)
    for (let g = 0; g < 4; g++) {
      s = winGame(s, 'a')
      if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
      s = winGame(s, 'b')
      if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
    }
    s = winGame(s, 'a')
    if (s.pendingOverlay !== 'none') s = dismissOverlay(s)
    s = winGame(s, 'a')
    expect(s.sets[0].completed).toBe(true)
    expect(s.sets[0].winner).toBe('a')
    expect(s.pendingOverlay).toBe('set_break')
    expect(s.sets.length).toBe(2)
  })

  it('completes best-of-3 match', () => {
    let s = createMatch(singlesConfig(), meta)
    // Win two sets 6-0
    for (let set = 0; set < 2; set++) {
      for (let g = 0; g < 6; g++) {
        s = winGame(s, 'a')
        if (s.pendingOverlay === 'changeover') s = dismissOverlay(s)
      }
      if (set === 0) {
        expect(s.pendingOverlay).toBe('set_break')
        s = dismissOverlay(s)
      }
    }
    expect(s.isComplete).toBe(true)
    expect(s.winner).toBe('a')
    expect(s.pendingOverlay).toBe('match_end')
  })
})

describe('pause', () => {
  it('blocks points and faults while paused', () => {
    let s = createMatch(singlesConfig(), meta)
    s = { ...s, pausedAt: 1_000 }
    const afterPoint = applyPoint(s, { winnerSide: 'a', outcome: 'winner' })
    expect(afterPoint).toBe(s)
    const afterFault = applyFault(s)
    expect(afterFault).toBe(s)
  })
})

describe('aces', () => {
  it('records ace for serving side', () => {
    let s = createMatch(singlesConfig(), meta)
    s = applyPoint(s, { winnerSide: 'a', outcome: 'ace' })
    expect(s.events[0].outcome).toBe('ace')
    expect(s.currentGame.pointsA).toBe(1)
  })
})
