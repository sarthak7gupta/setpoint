import { describe, expect, it } from 'vitest'
import { applyFault, applyPoint } from '../engine'
import { clearOverlay, freshSingles, reachSixAll, winGame, winPoint } from '../engine/testHelpers'
import { englishCallout } from './calloutCopy'
import { buildLiveCallout, serveCalloutText } from './gameCallout'

const nameOf = (id: string) => (id === 'p1' ? 'Ada' : 'Ben')
const t = englishCallout

describe('serveCalloutText', () => {
  it('names who serves', () => {
    const state = clearOverlay(freshSingles())
    expect(serveCalloutText({ state, nameOf, t })).toBe('Ada to serve.')
    expect(serveCalloutText({ state, nameOf, t, withSet: true })).toBe('first set, Ada to serve.')
  })
})

describe('buildLiveCallout', () => {
  it('announces the opening serve when play is live', () => {
    const next = clearOverlay(freshSingles())
    expect(buildLiveCallout({ prev: null, next, nameOf, t })).toBe('first set, Ada to serve.')
  })

  it('calls the point score from the server side', () => {
    const prev = clearOverlay(freshSingles())
    const next = winPoint(prev, 'a')
    expect(buildLiveCallout({ prev, next, nameOf, t })).toBe('15 love.')
  })

  it('calls fifteen-all and thirty-all', () => {
    let prev = clearOverlay(freshSingles())
    prev = winPoint(prev, 'a')
    const fifteenAll = winPoint(prev, 'b')
    expect(buildLiveCallout({ prev, next: fifteenAll, nameOf, t })).toBe('15 all.')
  })

  it('does not announce ace — only the score', () => {
    const prev = clearOverlay(freshSingles())
    const next = applyPoint(prev, { winnerSide: 'a', outcome: 'ace' })
    expect(buildLiveCallout({ prev, next, nameOf, t })).toBe('15 love.')
  })

  it('calls Fault on a first-serve miss', () => {
    const prev = clearOverlay(freshSingles())
    const next = applyFault(prev)
    expect(buildLiveCallout({ prev, next, nameOf, t })).toBe('Fault.')
  })

  it('calls Double fault then the score', () => {
    const prev = applyFault(clearOverlay(freshSingles()))
    const next = applyFault(prev)
    expect(buildLiveCallout({ prev, next, nameOf, t })).toBe('Double fault. love 15.')
  })

  it('calls a completed game and the next server when there is no rest', () => {
    let prev = clearOverlay(freshSingles())
    prev = winGame(prev, 'a')
    prev = clearOverlay(prev)
    const next = winGame(prev, 'a')
    expect(buildLiveCallout({ prev, next, nameOf, t })).toBe('Game, Ada. Ada to serve.')
  })

  it('does not recap games in the set after a regular game', () => {
    const prev = clearOverlay(freshSingles())
    const next = winGame(prev, 'a')
    const line = buildLiveCallout({ prev, next, nameOf, t })
    expect(line).toContain('Game, Ada.')
    expect(line).not.toMatch(/Ada 1/)
    expect(line).not.toContain('first set')
  })

  it('calls Deuce and Advantage', () => {
    let s = clearOverlay(freshSingles())
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    const deuce = winPoint(s, 'b')
    expect(buildLiveCallout({ prev: s, next: deuce, nameOf, t })).toBe('Deuce.')
    const ad = winPoint(deuce, 'a')
    expect(buildLiveCallout({ prev: deuce, next: ad, nameOf, t })).toBe('Advantage, Ada.')
  })

  it('calls deciding point at no-ad 40-40', () => {
    let s = clearOverlay(freshSingles({ noAdScoring: true }))
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'a')
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    const deuce = winPoint(s, 'b')
    expect(buildLiveCallout({ prev: s, next: deuce, nameOf, t })).toBe('Deciding point.')
  })

  it('calls six games all and tiebreak when the breaker starts', () => {
    let prev = clearOverlay(freshSingles())
    for (let g = 0; g < 5; g++) {
      prev = winGame(prev, 'a')
      prev = clearOverlay(prev)
      prev = winGame(prev, 'b')
      prev = clearOverlay(prev)
    }
    prev = winGame(prev, 'a')
    prev = clearOverlay(prev)
    const next = winGame(prev, 'b')
    expect(next.sets[0].isTiebreak).toBe(true)
    expect(buildLiveCallout({ prev, next, nameOf, t })).toBe(
      'Game, Ben. 6 games all. Tiebreak. Ada to serve.',
    )
  })

  it('does not call tiebreak at 6-6 in an advantage final set', () => {
    let prev = clearOverlay(freshSingles({ bestOf: 1, finalSetTiebreak: false }))
    for (let g = 0; g < 5; g++) {
      prev = winGame(prev, 'a')
      prev = clearOverlay(prev)
      prev = winGame(prev, 'b')
      prev = clearOverlay(prev)
    }
    prev = winGame(prev, 'a')
    prev = clearOverlay(prev)
    const next = winGame(prev, 'b')
    expect(next.sets[0].isTiebreak).toBe(false)
    const line = buildLiveCallout({ prev, next, nameOf, t })
    expect(line).toContain('Game, Ben.')
    expect(line).not.toMatch(/tiebreak/i)
    expect(line).not.toMatch(/games all/i)
  })

  it('does not announce who serves after a tiebreak point', () => {
    let prev = reachSixAll(clearOverlay(freshSingles()))
    prev = winPoint(prev, 'a')
    const next = winPoint(prev, 'b')
    expect(buildLiveCallout({ prev, next, nameOf, t })).toBe('1 1.')
  })

  it('stays silent while paused', () => {
    const prev = clearOverlay(freshSingles())
    const next = {
      ...applyPoint(prev, { winnerSide: 'a', outcome: 'winner' }),
      pausedAt: Date.now(),
    }
    expect(buildLiveCallout({ prev, next, nameOf, t })).toBeNull()
  })
})
