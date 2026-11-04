import { describe, expect, it } from 'vitest'
import {
  BACKUP_KIND,
  BACKUP_VERSION,
  BackupError,
  backupFileName,
  backupMatchLabel,
  backupPlayerNames,
  buildBackup,
  filterBackupMatches,
  mergeBackup,
  parseBackup,
  sliceBackup,
  stringifyBackup,
} from './backup'
import { freshDoubles, freshSingles } from './engine/testHelpers'
import type { MatchRecord, PlayerRecord } from './records'

const alice: PlayerRecord = { id: 'p1', name: 'Alice', createdAt: 10 }
const bob: PlayerRecord = { id: 'p2', name: 'Bob', createdAt: 20 }

function matchRecord(args: {
  id: string
  updatedAt: number
  names?: Record<string, string>
  date?: string
  doubles?: boolean
}): MatchRecord {
  const state = args.doubles ? freshDoubles() : freshSingles()
  const metadata = { ...state.metadata, date: args.date ?? state.metadata.date }
  return {
    id: args.id,
    createdAt: 1,
    updatedAt: args.updatedAt,
    config: state.config,
    metadata,
    state: { ...state, metadata },
    playerNames: args.names ?? { p1: 'Alice', p2: 'Bob' },
  }
}

describe('backup', () => {
  it('builds a portable file without native-only settings', () => {
    const match = matchRecord({ id: 'm1', updatedAt: 5 })
    const backup = buildBackup({
      players: [alice, bob],
      matches: [match],
      settings: {
        theme: 'australianOpen',
        defaultBestOf: 5,
        voiceCalloutsEnabled: false,
        locale: 'fr',
        hapticsEnabled: false,
        id: 'settings',
      },
      exportedAt: 1_725_000_000_000,
    })

    expect(backup.kind).toBe(BACKUP_KIND)
    expect(backup.version).toBe(BACKUP_VERSION)
    expect(backup.players).toEqual([alice, bob])
    expect(backup.matches[0]?.id).toBe('m1')
    expect(backup.settings).toEqual({
      theme: 'australianOpen',
      defaultBestOf: 5,
      voiceCalloutsEnabled: false,
    })
    expect(backup.settings).not.toHaveProperty('locale')
    expect(backup.settings).not.toHaveProperty('hapticsEnabled')
    expect(backup.settings).not.toHaveProperty('id')
  })

  it('round-trips JSON and names the file by date', () => {
    const backup = buildBackup({
      players: [alice],
      matches: [matchRecord({ id: 'm1', updatedAt: 9 })],
      settings: { theme: 'wimbledon' },
      exportedAt: Date.UTC(2026, 8, 5, 12),
    })
    const parsed = parseBackup(stringifyBackup(backup))
    expect(parsed.players).toEqual(backup.players)
    expect(parsed.matches).toHaveLength(1)
    expect(parsed.settings.theme).toBe('wimbledon')
    expect(backupFileName(new Date(2026, 8, 5, 15).getTime())).toBe('setpoint-2026-09-05.json')
  })

  it('keeps live undoHistory on a match', () => {
    const snap = freshSingles()
    const match = { ...matchRecord({ id: 'm1', updatedAt: 9 }), undoHistory: [snap] }
    const parsed = parseBackup(
      stringifyBackup(
        buildBackup({
          players: [alice],
          matches: [match],
          settings: { theme: 'wimbledon' },
          exportedAt: 1,
        }),
      ),
    )
    expect(parsed.matches[0]?.undoHistory).toHaveLength(1)
    expect(parsed.matches[0]?.undoHistory?.[0]?.config.playerIds).toEqual(snap.config.playerIds)
  })

  it('rejects files that are not SetPoint backups', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError)
    expect(() => parseBackup('{"hello":1}')).toThrow(BackupError)
    expect(() =>
      parseBackup(JSON.stringify({ kind: BACKUP_KIND, version: 99, players: [], matches: [] })),
    ).toThrow(BackupError)
  })

  it('skips malformed rows and still imports the rest', () => {
    const parsed = parseBackup(
      JSON.stringify({
        kind: BACKUP_KIND,
        version: BACKUP_VERSION,
        exportedAt: 1,
        players: [alice, { id: '', name: 'Nope' }, bob],
        matches: [{ id: 'bad' }, matchRecord({ id: 'm1', updatedAt: 3 })],
        settings: { theme: 'not-a-theme', defaultBestOf: 2, voiceCommandsEnabled: true },
      }),
    )
    expect(parsed.players.map((player) => player.id)).toEqual(['p1', 'p2'])
    expect(parsed.matches.map((match) => match.id)).toEqual(['m1'])
    expect(parsed.settings).toEqual({ voiceCommandsEnabled: true })
  })

  it('unions players and keeps the newer match when ids collide', () => {
    const older = matchRecord({ id: 'm1', updatedAt: 10, names: { p1: 'A', p2: 'B' } })
    const newer = matchRecord({ id: 'm1', updatedAt: 20, names: { p1: 'Ada', p2: 'Bea' } })
    const extra = matchRecord({ id: 'm2', updatedAt: 4 })
    const merged = mergeBackup({
      currentPlayers: [alice],
      currentMatches: [older],
      currentSettings: { theme: 'wimbledon', defaultBestOf: 3, voiceCalloutsEnabled: true },
      backup: buildBackup({
        players: [{ id: 'p1', name: 'Alicia', createdAt: 1, notes: 'lefty' }, bob],
        matches: [newer, extra],
        settings: { theme: 'usOpen', voiceCalloutsEnabled: false },
      }),
    })

    expect(merged.players).toEqual(
      expect.arrayContaining([{ id: 'p1', name: 'Alicia', createdAt: 1, notes: 'lefty' }, bob]),
    )
    expect(merged.matches.find((match) => match.id === 'm1')?.updatedAt).toBe(20)
    expect(merged.matches.find((match) => match.id === 'm1')?.playerNames.p1).toBe('Ada')
    expect(merged.matches.some((match) => match.id === 'm2')).toBe(true)
    expect(merged.settings).toEqual({
      theme: 'usOpen',
      defaultBestOf: 3,
      voiceCalloutsEnabled: false,
    })
    expect(merged.summary).toEqual({
      players: 2,
      matches: 2,
      matchesAdded: 1,
      matchesUpdated: 1,
    })
  })

  it('keeps the local match when the backup copy is older', () => {
    const local = matchRecord({ id: 'm1', updatedAt: 50 })
    const incoming = matchRecord({ id: 'm1', updatedAt: 10 })
    const merged = mergeBackup({
      currentPlayers: [],
      currentMatches: [local],
      currentSettings: {},
      backup: buildBackup({ players: [], matches: [incoming], settings: {} }),
    })
    expect(merged.matches[0]?.updatedAt).toBe(50)
    expect(merged.summary.matchesUpdated).toBe(0)
  })

  it('filters matches by player, date, and format', () => {
    const aliceBob = matchRecord({
      id: 'm1',
      updatedAt: 2,
      date: '2026-09-01',
      names: { p1: 'Alice', p2: 'Bob' },
    })
    const adaBea = matchRecord({
      id: 'm2',
      updatedAt: 3,
      date: '2026-08-01',
      names: { p1: 'Ada', p2: 'Bea' },
    })
    const doubles = matchRecord({
      id: 'm3',
      updatedAt: 4,
      date: '2026-09-02',
      doubles: true,
      names: { a1: 'Alice', a2: 'Ada', b1: 'Bob', b2: 'Bea' },
    })
    const matches = [aliceBob, adaBea, doubles]

    expect(backupPlayerNames(matches)).toEqual(['Ada', 'Alice', 'Bea', 'Bob'])
    expect(backupMatchLabel(aliceBob)).toBe('Alice vs Bob')
    expect(filterBackupMatches({ matches, playerName: 'Alice' }).map((row) => row.id)).toEqual([
      'm3',
      'm1',
    ])
    expect(
      filterBackupMatches({ matches, playerNames: ['Alice', 'Ada'] }).map((row) => row.id),
    ).toEqual(['m3', 'm1', 'm2'])
    expect(
      filterBackupMatches({ matches, fromDate: '2026-09-01', toDate: '2026-09-01' }).map(
        (row) => row.id,
      ),
    ).toEqual(['m1'])
    expect(filterBackupMatches({ matches, format: 'doubles' }).map((row) => row.id)).toEqual(['m3'])
  })

  it('slices a backup down to chosen matches and related players', () => {
    const keep = matchRecord({
      id: 'm1',
      updatedAt: 2,
      names: { p1: 'Alice', p2: 'Bob' },
    })
    const drop = matchRecord({
      id: 'm2',
      updatedAt: 3,
      names: { p1: 'Ada', p2: 'Bea' },
    })
    const backup = buildBackup({
      players: [
        alice,
        bob,
        { id: 'p3', name: 'Ada', createdAt: 3 },
        { id: 'p4', name: 'Bea', createdAt: 4 },
      ],
      matches: [keep, drop],
      settings: { theme: 'usOpen' },
    })
    const sliced = sliceBackup({
      backup,
      matchIds: ['m1'],
      includeSettings: false,
    })
    expect(sliced.matches.map((match) => match.id)).toEqual(['m1'])
    expect(sliced.players.map((player) => player.id).sort()).toEqual(['p1', 'p2'])
    expect(sliced.settings).toEqual({})
  })
})
