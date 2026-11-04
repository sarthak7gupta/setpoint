import { describe, expect, it, vi } from 'vitest'
import { freshDoubles, freshSingles } from '../engine/testHelpers'
import {
  describeVoiceCommand,
  dispatchVoiceCommand,
  parseVoiceCommand,
  type VoiceCommandActions,
  type VoicePlayer,
  voicePlayersFromState,
} from './voiceCommand'

const players: VoicePlayer[] = [
  { id: 'p1', name: 'Ada Lovelace', side: 'a' },
  { id: 'p2', name: 'Ben Jones', side: 'b' },
]

const parse = (transcript: string) =>
  parseVoiceCommand({
    transcript,
    players,
    serverId: 'p1',
    receiverId: 'p2',
  })

describe('parseVoiceCommand', () => {
  it('awards a named player a generic point', () => {
    expect(parse('Ada')).toEqual({
      kind: 'point',
      side: 'a',
      outcome: 'other',
      attributedPlayerId: 'p1',
    })
    expect(parse('point Ben')).toEqual({
      kind: 'point',
      side: 'b',
      outcome: 'other',
      attributedPlayerId: 'p2',
    })
  })

  it('uses unique first names and ignores shared tokens', () => {
    const twins: VoicePlayer[] = [
      { id: 'a1', name: 'Ada Smith', side: 'a' },
      { id: 'a2', name: 'Ada Jones', side: 'b' },
    ]
    expect(
      parseVoiceCommand({
        transcript: 'Ada',
        players: twins,
        serverId: 'a1',
        receiverId: 'a2',
      }).kind,
    ).toBe('unknown')
    expect(
      parseVoiceCommand({
        transcript: 'Ada Smith winner',
        players: twins,
        serverId: 'a1',
        receiverId: 'a2',
      }),
    ).toEqual({
      kind: 'point',
      side: 'a',
      outcome: 'winner',
      attributedPlayerId: 'a1',
    })
  })

  it('maps side aliases, server, and receiver', () => {
    expect(parse('point a').kind).toBe('point')
    expect(parse('point a')).toMatchObject({ side: 'a', outcome: 'other' })
    expect(parse('team b')).toMatchObject({ side: 'b' })
    expect(parse('point server')).toMatchObject({ side: 'a', attributedPlayerId: undefined })
    expect(parse('receiver')).toMatchObject({ side: 'b' })
  })

  it('does not treat “point Ada” as team A', () => {
    expect(parse('point Ada')).toMatchObject({ side: 'a', attributedPlayerId: 'p1' })
  })

  it('always gives aces to the server', () => {
    expect(parse('ace')).toEqual({
      kind: 'point',
      side: 'a',
      outcome: 'ace',
      attributedPlayerId: 'p1',
    })
    expect(parse('ace Ben')).toMatchObject({ outcome: 'ace', attributedPlayerId: 'p1' })
  })

  it('parses outcomes, faults, and match control', () => {
    expect(parse('winner Ada')).toMatchObject({ outcome: 'winner', attributedPlayerId: 'p1' })
    expect(parse('UE Ben')).toMatchObject({ outcome: 'unforced_error', attributedPlayerId: 'p2' })
    expect(parse('forced error Ada')).toMatchObject({ outcome: 'other', attributedPlayerId: 'p1' })
    expect(parse('fault')).toEqual({ kind: 'fault' })
    expect(parse('double fault')).toEqual({ kind: 'fault' })
    expect(parse('falta')).toEqual({ kind: 'fault' })
    expect(parse('undo')).toEqual({ kind: 'undo' })
    expect(parse('pause')).toEqual({ kind: 'pause' })
    expect(parse('resume')).toEqual({ kind: 'resume' })
    expect(parse('skip')).toEqual({ kind: 'skip' })
    expect(parse('continue')).toEqual({ kind: 'continue' })
  })

  it('does not treat hold or an empty line as a command', () => {
    expect(parse('')).toEqual({ kind: 'unknown' })
    expect(parse('hold')).toEqual({ kind: 'unknown' })
    expect(parse('let')).toEqual({ kind: 'unknown' })
  })
})

describe('voicePlayersFromState', () => {
  it('labels singles and doubles sides', () => {
    const singles = voicePlayersFromState({
      state: freshSingles(),
      nameOf: (id) => (id === 'p1' ? 'Ada' : 'Ben'),
    })
    expect(singles).toEqual([
      { id: 'p1', name: 'Ada', side: 'a' },
      { id: 'p2', name: 'Ben', side: 'b' },
    ])
    const doubles = voicePlayersFromState({
      state: freshDoubles(),
      nameOf: (id) => id,
    })
    expect(doubles.map((player) => player.side)).toEqual(['a', 'a', 'b', 'b'])
  })
})

describe('dispatchVoiceCommand', () => {
  const actions = (): VoiceCommandActions => ({
    point: vi.fn(),
    fault: vi.fn(),
    undo: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    skip: vi.fn(),
  })

  const idle = { paused: false, overlay: false, complete: false, canUndo: true }

  it('scores only while the match is live', () => {
    const live = actions()
    expect(
      dispatchVoiceCommand({
        command: { kind: 'point', side: 'a', outcome: 'other' },
        context: idle,
        actions: live,
      }),
    ).toBe(true)
    expect(live.point).toHaveBeenCalledWith({
      winnerSide: 'a',
      outcome: 'other',
      attributedPlayerId: undefined,
    })

    const paused = actions()
    expect(
      dispatchVoiceCommand({
        command: { kind: 'fault' },
        context: { ...idle, paused: true },
        actions: paused,
      }),
    ).toBe(false)
    expect(paused.fault).not.toHaveBeenCalled()
  })

  it('maps continue to resume or skip from context', () => {
    const paused = actions()
    expect(
      dispatchVoiceCommand({
        command: { kind: 'continue' },
        context: { ...idle, paused: true },
        actions: paused,
      }),
    ).toBe(true)
    expect(paused.resume).toHaveBeenCalledOnce()

    const overlay = actions()
    expect(
      dispatchVoiceCommand({
        command: { kind: 'continue' },
        context: { ...idle, overlay: true },
        actions: overlay,
      }),
    ).toBe(true)
    expect(overlay.skip).toHaveBeenCalledOnce()
  })

  it('blocks undo while paused and skip while idle', () => {
    const paused = actions()
    expect(
      dispatchVoiceCommand({
        command: { kind: 'undo' },
        context: { ...idle, paused: true },
        actions: paused,
      }),
    ).toBe(false)
    const idleSkip = actions()
    expect(
      dispatchVoiceCommand({
        command: { kind: 'skip' },
        context: idle,
        actions: idleSkip,
      }),
    ).toBe(false)
  })
})

describe('describeVoiceCommand', () => {
  it('names the awarded player', () => {
    expect(
      describeVoiceCommand({
        command: { kind: 'point', side: 'a', outcome: 'winner', attributedPlayerId: 'p1' },
        nameOf: (id) => (id === 'p1' ? 'Ada' : 'Ben'),
      }),
    ).toBe('Winner, Ada')
    expect(
      describeVoiceCommand({
        command: { kind: 'unknown' },
        nameOf: () => '',
      }),
    ).toBe('Not understood')
  })
})
