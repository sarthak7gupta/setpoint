import { expect, it } from 'vitest'
import { freshSingles } from '../engine/testHelpers'
import { filterMatchHistory, validDateRange } from './historyFilters'

it('combines player, date and completion filters', () => {
  const state = freshSingles(),
    metadata = { ...state.metadata, date: '2026-09-01' }
  const records = [
    {
      id: 'm',
      createdAt: 1,
      updatedAt: 1,
      state,
      config: state.config,
      metadata,
      playerNames: { p1: 'Alice', p2: 'Bob' },
    },
  ]
  expect(
    filterMatchHistory(records, {
      search: 'ali',
      from: '2026-09-01',
      to: '2026-09-02',
      status: 'ongoing',
    }),
  ).toHaveLength(1)
  expect(
    filterMatchHistory(records, { search: '', from: '', to: '', status: 'final' }),
  ).toHaveLength(0)
  expect(validDateRange('2026-02-30', '')).toBe(false)
  expect(validDateRange('2026-09-02', '2026-09-01')).toBe(false)
})
