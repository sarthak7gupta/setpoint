import { describe, expect, it } from 'vitest'
import { applyPoint, createMatch, dismissOverlay } from './scoring'
import type { MatchConfig, MatchMetadata, MatchState } from './types'

const meta: MatchMetadata = { date: '2026-08-31' }

function singlesConfig(): MatchConfig {
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
  }
}

function winGame(state: MatchState, side: 'a' | 'b'): MatchState {
  let s = state
  for (let i = 0; i < 10; i++) {
    if (
      s.pendingOverlay === 'changeover' ||
      s.pendingOverlay === 'set_break' ||
      s.pendingOverlay === 'ball_change'
    ) {
      s = dismissOverlay(s)
    }
    const setIndex = s.sets.length - 1
    const before = side === 'a' ? s.sets[setIndex].gamesA : s.sets[setIndex].gamesB
    const completedBefore = s.sets.filter((set) => set.completed).length
    s = applyPoint(s, { winnerSide: side, outcome: 'winner' })
    const completedAfter = s.sets.filter((set) => set.completed).length
    const afterGames = s.sets[Math.min(setIndex, s.sets.length - 1)]
    const after =
      afterGames.completed && completedAfter > completedBefore
        ? side === 'a'
          ? afterGames.gamesA
          : afterGames.gamesB
        : side === 'a'
          ? s.sets[s.sets.length - 1].gamesA
          : s.sets[s.sets.length - 1].gamesB
    if (
      after > before ||
      completedAfter > completedBefore ||
      s.pendingOverlay === 'set_break' ||
      s.pendingOverlay === 'changeover' ||
      s.pendingOverlay === 'ball_change' ||
      s.isComplete
    ) {
      return s
    }
  }
  return s
}

describe('set break undo semantics', () => {
  it('dismissOverlay leaves score unchanged so skip need not be undoable', () => {
    let s = createMatch(singlesConfig(), meta)
    for (let g = 0; g < 6; g++) {
      s = winGame(s, 'a')
      if (s.pendingOverlay === 'changeover' || s.pendingOverlay === 'ball_change') {
        s = dismissOverlay(s)
      }
    }
    expect(s.pendingOverlay).toBe('set_break')
    expect(s.sets[0].completed).toBe(true)
    const events = s.events.length
    const dismissed = dismissOverlay(s)
    expect(dismissed.pendingOverlay).toBe('none')
    expect(dismissed.events.length).toBe(events)
    expect(dismissed.sets[0].winner).toBe('a')
  })
})
