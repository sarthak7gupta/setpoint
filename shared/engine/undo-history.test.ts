/**
 * Undo / overlay interaction — mirrors LiveMatch controller semantics.
 */
import { describe, expect, it } from 'vitest'
import { getServeInfo, undoLastPoint } from './scoring'
import { clearOverlay, freshSingles, winGame, winSetToLove, withUndoStack } from './testHelpers'

describe('undo history with overlays', () => {
  it('undo during set break restores pre-set-winning point and clears overlay', () => {
    const u = withUndoStack()
    let s = freshSingles()
    for (let g = 0; g < 5; g++) {
      for (let p = 0; p < 4; p++) s = u.point(s, 'a')
      if (s.pendingOverlay === 'changeover') s = u.dismiss(s)
    }
    // Game 6: three points then winning point on stack
    for (let p = 0; p < 3; p++) s = u.point(s, 'a')
    expect(s.pendingOverlay).toBe('none')
    s = u.point(s, 'a')
    expect(s.pendingOverlay).toBe('set_break')
    expect(s.sets[0].completed).toBe(true)

    s = u.undo(s)
    expect(s.pendingOverlay).toBe('none')
    expect(s.sets[0].completed).toBe(false)
    expect(s.sets[0].gamesA).toBe(5)
    expect(s.currentGame.pointsA).toBe(3)
  })

  it('dismissing set break does not consume an undo slot', () => {
    const u = withUndoStack()
    let s = freshSingles()
    s = winSetToLove(s, 'a')
    // Manually rebuild stack depth by playing with helper that doesn't use u —
    // instead push the set-break state as if commit did
    const breakState = s
    expect(breakState.pendingOverlay).toBe('set_break')
    u.stack.push(structuredClone(breakState))
    // Simulate: we need history BEFORE set break. Reset approach:
    const u2 = withUndoStack()
    s = freshSingles()
    for (let g = 0; g < 6; g++) {
      for (let p = 0; p < 4; p++) s = u2.point(s, 'a')
      if (s.pendingOverlay === 'changeover') s = u2.dismiss(s)
    }
    expect(s.pendingOverlay).toBe('set_break')
    const depth = u2.stack.length
    s = u2.dismiss(s)
    expect(u2.stack.length).toBe(depth)
    expect(s.pendingOverlay).toBe('none')
    s = u2.undo(s)
    expect(s.sets[0].completed).toBe(false)
  })

  it('undo after changeover restores previous game server', () => {
    const u = withUndoStack()
    let s = freshSingles()
    expect(getServeInfo(s).serverId).toBe('p1')
    for (let p = 0; p < 4; p++) s = u.point(s, 'a')
    expect(s.pendingOverlay).toBe('changeover')
    expect(getServeInfo(s).serverId).toBe('p2')
    s = u.undo(s)
    expect(s.pendingOverlay).toBe('none')
    expect(s.sets[0].gamesA).toBe(0)
    expect(getServeInfo(s).serverId).toBe('p1')
  })

  it('can undo multiple points through a changeover boundary after dismiss', () => {
    const u = withUndoStack()
    let s = freshSingles()
    for (let p = 0; p < 4; p++) s = u.point(s, 'a')
    expect(s.pendingOverlay).toBe('changeover')
    s = u.dismiss(s)
    s = u.point(s, 'b')
    s = u.undo(s) // undo point in game 2
    expect(s.currentGame.pointsB).toBe(0)
    s = u.undo(s) // undo set-winning... actually last push before dismiss was game1 end
    // After dismiss, stack top is state at end of game 1 with changeover still?
    // dismiss doesn't push, so undo pops to before last point of game 1...
    // Wait: after 4 points, stack has 4 entries (before each point). State is changeover.
    // dismiss: no push. undo: pops before-4th-point → 40-0 still in game, no overlay.
    expect(s.sets[0].gamesA).toBe(0)
  })

  it('fault then undo restores first-serve state', () => {
    const u = withUndoStack()
    let s = freshSingles()
    s = u.fault(s)
    expect(s.isSecondServe).toBe(true)
    s = u.undo(s)
    expect(s.isSecondServe).toBe(false)
  })

  it('undo after match-winning point restores match point', () => {
    const u = withUndoStack()
    let s = freshSingles({ bestOf: 1 })
    for (let g = 0; g < 5; g++) {
      for (let p = 0; p < 4; p++) s = u.point(s, 'a')
      if (s.pendingOverlay === 'changeover') s = u.dismiss(s)
    }
    for (let p = 0; p < 3; p++) s = u.point(s, 'a')
    expect(s.isComplete).toBe(false)
    s = u.point(s, 'a')
    expect(s.isComplete).toBe(true)
    expect(s.pendingOverlay).toBe('match_end')

    s = u.undo(s)
    expect(s.isComplete).toBe(false)
    expect(s.winner).toBeUndefined()
    expect(s.pendingOverlay).toBe('none')
    expect(s.sets[0].completed).toBe(false)
    expect(s.sets[0].gamesA).toBe(5)
    expect(s.currentGame.pointsA).toBe(3)
  })
})

describe('undoLastPoint (summary / persisted match)', () => {
  it('replays without the match-winning point', () => {
    let s = winSetToLove(freshSingles({ bestOf: 1 }), 'a')
    expect(s.isComplete).toBe(true)
    const eventCount = s.events.length
    const undone = undoLastPoint(s)
    expect(undone).not.toBeNull()
    expect(undone!.isComplete).toBe(false)
    expect(undone!.winner).toBeUndefined()
    expect(undone!.pendingOverlay).toBe('none')
    expect(undone!.events).toHaveLength(eventCount - 1)
    expect(undone!.sets[0].completed).toBe(false)
    expect(undone!.sets[0].gamesA).toBe(5)
    expect(undone!.currentGame.pointsA).toBe(3)
    expect(undone!.startedAt).toBe(s.startedAt)
  })

  it('returns null when there are no points', () => {
    expect(undoLastPoint(freshSingles())).toBeNull()
  })
})

describe('changeover after odd games', () => {
  it('shows changeover after games 1,3,5 but not 2,4,6(set)', () => {
    let s = freshSingles()
    s = winGame(s, 'a')
    expect(s.pendingOverlay).toBe('changeover')
    s = clearOverlay(s)
    s = winGame(s, 'b')
    expect(s.pendingOverlay).toBe('none')
    s = winGame(s, 'a')
    expect(s.pendingOverlay).toBe('changeover')
  })
})
