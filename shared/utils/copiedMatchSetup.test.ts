import { describe, expect, it } from 'vitest'
import { freshDoubles, freshSingles } from '../engine/testHelpers'
import type { MatchRecord } from '../records'
import { copiedMatchSetup } from './copiedMatchSetup'

function recordFromState(
  state: ReturnType<typeof freshSingles>,
  playerNames: Record<string, string>,
): MatchRecord {
  return {
    id: 'm1',
    createdAt: 1,
    updatedAt: 1,
    config: state.config,
    metadata: state.metadata,
    state,
    playerNames,
  }
}

describe('copiedMatchSetup', () => {
  it('copies singles players, rules, and first server', () => {
    const state = freshSingles({
      bestOf: 1,
      tiebreakPoints: 10,
      noAdScoring: true,
      warmupEnabled: true,
      warmupDurationSeconds: 180,
      ballChangeEnabled: false,
    })
    const setup = copiedMatchSetup(recordFromState(state, { p1: 'Ada', p2: 'Bea' }))
    expect(setup.format).toBe('singles')
    expect(setup.names).toEqual(['Ada', 'Bea', '', ''])
    expect(setup.bestOf).toBe(1)
    expect(setup.tiebreakPoints).toBe(10)
    expect(setup.noAdScoring).toBe(true)
    expect(setup.firstServerIndex).toBe(0)
    expect(setup.warmupEnabled).toBe(true)
    expect(setup.warmupSec).toBe(180)
    expect(setup.ballChangeEnabled).toBe(false)
  })

  it('copies doubles lineup and first receiver', () => {
    const state = freshDoubles({ firstServerId: 'b1', firstReceiverId: 'a2' })
    const setup = copiedMatchSetup(
      recordFromState(state, {
        a1: 'A1',
        a2: 'A2',
        b1: 'B1',
        b2: 'B2',
      }),
    )
    expect(setup.format).toBe('doubles')
    expect(setup.names).toEqual(['A1', 'A2', 'B1', 'B2'])
    expect(setup.firstServerIndex).toBe(2)
    expect(setup.firstReceiverIndex).toBe(1)
  })
})
