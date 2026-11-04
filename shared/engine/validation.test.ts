import { expect, it } from 'vitest'
import { parseBackup } from '../backup'
import { buildWatchSnapshot, parseWatchSnapshot } from '../watch/protocol'
import { freshDoubles, freshSingles, winSetToLove } from './testHelpers'
import { isMatchConfig, isMatchState } from './validation'

it('accepts singles, doubles, and completed engine states', () => {
  for (const state of [
    freshSingles(),
    freshDoubles(),
    winSetToLove(freshSingles({ bestOf: 1 }), 'a'),
  ])
    expect(isMatchState(state)).toBe(true)
})
it('rejects invalid lineups, rule numbers, nested sets, events and serve rotation', () => {
  const s = freshSingles()
  for (const state of [
    { ...s, sets: [] },
    { ...s, sets: [{}] },
    { ...s, events: [{}] },
    { ...s, serveOrder: ['p1', 'p1'] },
    { ...s, receiverId: 'p1' },
  ])
    expect(isMatchState(state)).toBe(false)
  expect(isMatchConfig({ ...s.config, playerIds: ['p1', 'p1'] })).toBe(false)
  expect(isMatchConfig({ ...s.config, tiebreakPoints: -1 })).toBe(false)
  expect(
    parseWatchSnapshot({
      ...buildWatchSnapshot({ matchId: 'm', state: s, playerNames: {}, theme: 'wimbledon' }),
      state: { ...s, sets: [] },
    }),
  ).toBeNull()
})
it('does not admit the malformed backup that previously passed', () => {
  const backup = parseBackup(
    JSON.stringify({
      kind: 'setpoint-backup',
      version: 1,
      matches: [
        {
          id: 'bad',
          createdAt: 1,
          updatedAt: 1,
          config: { playerIds: [] },
          metadata: {},
          state: {},
          playerNames: {},
        },
      ],
    }),
  )
  expect(backup.matches).toEqual([])
})
