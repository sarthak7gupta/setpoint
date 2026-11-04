import { expect, it } from 'vitest'
import type { PlayerRecord } from '../records'
import { mergePlayerProfiles, playerIdentityIds, recoverPlayerProfiles } from './players'

const players: PlayerRecord[] = [
  { id: 'a', name: 'Alex', createdAt: 1 },
  { id: 'b', name: 'Alex', createdAt: 2 },
]
it('preserves same-name people until an explicit merge', () => {
  expect(recoverPlayerProfiles(players, [])).toHaveLength(2)
  expect([...playerIdentityIds('a', players)]).toEqual(['a'])
})
it('merges identities without changing historical ids or deleting source profiles', () => {
  const merged = mergePlayerProfiles(players, [], 'a', 'b')
  expect(merged).toHaveLength(2)
  expect(merged[0].mergedInto).toBe('b')
  expect([...playerIdentityIds('b', merged)].sort()).toEqual(['a', 'b'])
  expect(() => mergePlayerProfiles(merged, [], 'b', 'a')).toThrow()
})
