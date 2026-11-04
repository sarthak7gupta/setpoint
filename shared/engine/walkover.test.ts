import { describe, expect, it } from 'vitest'
import { applyWalkover, undoWalkover } from './scoring'
import { clearOverlay, freshSingles, winPoint, winSetToLove } from './testHelpers'

describe('walkover', () => {
  it('awards the match without inventing games', () => {
    let s = freshSingles()
    s = winPoint(s, 'a')
    const beforeGames = s.sets[0].gamesA
    const next = applyWalkover(s, { winnerSide: 'b' })
    expect(next.isComplete).toBe(true)
    expect(next.winner).toBe('b')
    expect(next.endedBy).toBe('walkover')
    expect(next.pendingOverlay).toBe('match_end')
    expect(next.finishedAt).toBeTypeOf('number')
    expect(next.sets[0].gamesA).toBe(beforeGames)
    expect(next.events).toHaveLength(1)
  })

  it('no-ops when the match is already complete', () => {
    let s = freshSingles({ bestOf: 1 })
    s = applyWalkover(s, { winnerSide: 'a' })
    const again = applyWalkover(s, { winnerSide: 'b' })
    expect(again).toBe(s)
    expect(again.winner).toBe('a')
  })

  it('clears pause and away when awarding', () => {
    let s = freshSingles()
    s = { ...s, pausedAt: Date.now(), awayAt: Date.now() }
    const next = applyWalkover(s, { winnerSide: 'a' })
    expect(next.pausedAt).toBeUndefined()
    expect(next.awayAt).toBeUndefined()
  })

  it('undoWalkover reopens the match with score intact', () => {
    let s = freshSingles()
    s = winPoint(s, 'a', 'ace')
    s = applyWalkover(s, { winnerSide: 'a' })
    const reopened = undoWalkover(s)
    expect(reopened).not.toBeNull()
    expect(reopened!.isComplete).toBe(false)
    expect(reopened!.winner).toBeUndefined()
    expect(reopened!.endedBy).toBeUndefined()
    expect(reopened!.finishedAt).toBeUndefined()
    expect(reopened!.pendingOverlay).toBe('none')
    expect(reopened!.events).toHaveLength(1)
  })

  it('undoWalkover no-ops for normal completions', () => {
    let s = freshSingles({ bestOf: 1 })
    s = clearOverlay(winSetToLove(s, 'a'))
    expect(s.isComplete).toBe(true)
    expect(s.endedBy).toBeUndefined()
    expect(undoWalkover(s)).toBeNull()
  })
})
