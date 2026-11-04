import { describe, expect, it } from 'vitest'
import { freshSingles, winSetToLove } from '../engine/testHelpers'
import type { MatchRecord } from '../records'
import { headToHead, playerForm } from './form'

function record(args: {
  id: string
  playerIds: string[]
  winner: 'a' | 'b'
  completedAt: number
}): MatchRecord {
  const state = winSetToLove(freshSingles({ bestOf: 1, playerIds: args.playerIds }), args.winner)
  return {
    id: args.id,
    createdAt: args.completedAt,
    updatedAt: args.completedAt,
    completedAt: args.completedAt,
    config: state.config,
    metadata: state.metadata,
    state,
    playerNames: Object.fromEntries(args.playerIds.map((id) => [id, id])),
  }
}

describe('playerForm', () => {
  it('pads with grey empties and keeps last five, oldest left', () => {
    const matches = [
      record({ id: '1', playerIds: ['p1', 'p2'], winner: 'a', completedAt: 1 }),
      record({ id: '2', playerIds: ['p1', 'p2'], winner: 'b', completedAt: 2 }),
      record({ id: '3', playerIds: ['p1', 'p3'], winner: 'a', completedAt: 3 }),
    ]
    expect(playerForm({ playerId: 'p1', matches })).toEqual([
      'empty',
      'empty',
      'win',
      'loss',
      'win',
    ])
  })
})

describe('headToHead', () => {
  it('returns null when they have never met', () => {
    const matches = [record({ id: '1', playerIds: ['p1', 'p3'], winner: 'a', completedAt: 1 })]
    expect(
      headToHead({
        format: 'singles',
        idsA: ['p1'],
        idsB: ['p2'],
        matches,
      }),
    ).toBeNull()
  })

  it('counts meetings regardless of who was side a', () => {
    const matches = [
      record({ id: '1', playerIds: ['p1', 'p2'], winner: 'a', completedAt: 1 }),
      record({ id: '2', playerIds: ['p2', 'p1'], winner: 'a', completedAt: 2 }),
    ]
    expect(
      headToHead({
        format: 'singles',
        idsA: ['p1'],
        idsB: ['p2'],
        matches,
      }),
    ).toEqual({ meetings: 2, winsA: 1, winsB: 1 })
  })
})
