/**
 * Parse spoken tennis scoring into the same actions as the live buttons.
 * Platform hooks only capture audio; this module is shared and fully tested.
 */
import { type PointInput, type PointOutcome, playersOnSide, type Side } from '../engine'
import type { MatchState } from '../engine/types'

export type VoiceCommand =
  | {
      kind: 'point'
      side: Side
      outcome: PointOutcome
      attributedPlayerId?: string
    }
  | { kind: 'fault' }
  | { kind: 'undo' }
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'skip' }
  | { kind: 'continue' }
  | { kind: 'unknown' }

export interface VoicePlayer {
  id: string
  name: string
  side: Side
}

export interface VoiceCommandContext {
  paused: boolean
  overlay: boolean
  complete: boolean
  canUndo: boolean
}

export interface VoiceCommandActions {
  point: (input: PointInput) => void
  fault: () => void
  undo: () => void
  pause: () => void
  resume: () => void
  skip: () => void
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function padded(text: string): string {
  return ` ${text} `
}

function hasPhrase(text: string, phrase: string): boolean {
  return padded(text).includes(` ${phrase} `)
}

function hasAny(text: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => hasPhrase(text, phrase))
}

function detectOutcome(text: string): PointOutcome {
  if (hasAny(text, ['ace', 'aces'])) return 'ace'
  if (hasAny(text, ['unforced', 'unforced error', 'ue'])) return 'unforced_error'
  if (hasAny(text, ['winner', 'winners', 'ganador', 'ganadora'])) return 'winner'
  return 'other'
}

function mentionedPlayers(args: { text: string; players: VoicePlayer[] }): VoicePlayer[] {
  const { text, players } = args
  const hits: VoicePlayer[] = []
  for (const player of players) {
    const full = normalize(player.name)
    if (full.length >= 2 && hasPhrase(text, full)) {
      hits.push(player)
      continue
    }
    const tokens = full.split(' ').filter((token) => token.length >= 3)
    const uniqueToken = tokens.find((token) => {
      const others = players.filter((other) => other.id !== player.id)
      const clash = others.some((other) => normalize(other.name).split(' ').includes(token))
      return !clash && hasPhrase(text, token)
    })
    if (uniqueToken) hits.push(player)
  }
  return hits
}

function sideFromText(args: {
  text: string
  serverId: string
  receiverId: string
  players: VoicePlayer[]
}): Side | null {
  const { text, serverId, receiverId, players } = args
  if (hasAny(text, ['team a', 'player a', 'side a', 'point a', 'punto a'])) return 'a'
  if (hasAny(text, ['team b', 'player b', 'side b', 'point b', 'punto b'])) return 'b'
  if (hasAny(text, ['server', 'serving'])) {
    return players.find((player) => player.id === serverId)?.side ?? null
  }
  if (hasAny(text, ['receiver', 'receiving', 'returner'])) {
    return players.find((player) => player.id === receiverId)?.side ?? null
  }
  return null
}

/**
 * Parse a spoken tennis scoring line into a command.
 * Names must be unique enough (full name, or a 3+ letter token nobody else shares).
 */
export function parseVoiceCommand(args: {
  transcript: string
  players: VoicePlayer[]
  serverId: string
  receiverId: string
}): VoiceCommand {
  const text = normalize(args.transcript)
  if (!text) return { kind: 'unknown' }

  if (hasAny(text, ['undo', 'rewind', 'scratch', 'deshacer', 'annuler'])) {
    return { kind: 'undo' }
  }
  if (hasAny(text, ['resume', 'unpause'])) {
    return { kind: 'resume' }
  }
  if (hasAny(text, ['pause', 'pausa'])) {
    return { kind: 'pause' }
  }
  if (hasAny(text, ['continue', 'continuar', 'continuer'])) {
    return { kind: 'continue' }
  }
  if (hasAny(text, ['skip', 'skip timer', 'skip break'])) {
    return { kind: 'skip' }
  }
  if (
    hasAny(text, [
      'fault',
      'double fault',
      'doublefault',
      'df',
      'falta',
      'doble falta',
      'faute',
      'double faute',
    ])
  ) {
    return { kind: 'fault' }
  }

  const outcome = detectOutcome(text)
  const named = mentionedPlayers({ text, players: args.players })
  const uniqueNamed = [...new Map(named.map((player) => [player.id, player])).values()]
  const sideFromName =
    uniqueNamed.length === 0
      ? null
      : uniqueNamed.every((player) => player.side === uniqueNamed[0].side)
        ? uniqueNamed[0].side
        : null
  const side =
    sideFromName ??
    sideFromText({
      text,
      serverId: args.serverId,
      receiverId: args.receiverId,
      players: args.players,
    })

  if (outcome === 'ace') {
    const server = args.players.find((player) => player.id === args.serverId)
    if (!server) return { kind: 'unknown' }
    return {
      kind: 'point',
      side: server.side,
      outcome: 'ace',
      attributedPlayerId: args.serverId,
    }
  }

  if (!side) return { kind: 'unknown' }

  const attributed =
    uniqueNamed.length === 1 && uniqueNamed[0].side === side ? uniqueNamed[0].id : undefined

  return {
    kind: 'point',
    side,
    outcome,
    attributedPlayerId: attributed,
  }
}

export function voicePlayersFromState(args: {
  state: MatchState
  nameOf: (id: string) => string
}): VoicePlayer[] {
  const { state, nameOf } = args
  return (['a', 'b'] as const).flatMap((side) =>
    playersOnSide(state.config, side).map((id) => ({
      id,
      name: nameOf(id),
      side,
    })),
  )
}

export function describeVoiceCommand(args: {
  command: VoiceCommand
  nameOf: (id: string) => string
}): string {
  const { command, nameOf } = args
  if (command.kind === 'unknown') return 'Not understood'
  if (command.kind === 'undo') return 'Undo'
  if (command.kind === 'pause') return 'Pause'
  if (command.kind === 'resume') return 'Resume'
  if (command.kind === 'skip') return 'Skip break'
  if (command.kind === 'continue') return 'Continue'
  if (command.kind === 'fault') return 'Fault'
  const who = command.attributedPlayerId
    ? nameOf(command.attributedPlayerId)
    : command.side === 'a'
      ? 'side A'
      : 'side B'
  if (command.outcome === 'ace') return `Ace, ${who}`
  if (command.outcome === 'winner') return `Winner, ${who}`
  if (command.outcome === 'unforced_error') return `U. Error, ${who}`
  return `Point, ${who}`
}

/** Apply a parsed command using the same gates as the live scoring buttons. */
export function dispatchVoiceCommand(args: {
  command: VoiceCommand
  context: VoiceCommandContext
  actions: VoiceCommandActions
}): boolean {
  const { command, context, actions } = args
  if (command.kind === 'unknown') return false

  if (command.kind === 'continue') {
    if (context.paused) {
      actions.resume()
      return true
    }
    if (context.overlay) {
      actions.skip()
      return true
    }
    return false
  }
  if (command.kind === 'resume') {
    if (!context.paused) return false
    actions.resume()
    return true
  }
  if (command.kind === 'pause') {
    if (context.paused || context.complete) return false
    actions.pause()
    return true
  }
  if (command.kind === 'skip') {
    if (!context.overlay || context.paused) return false
    actions.skip()
    return true
  }
  if (command.kind === 'undo') {
    if (!context.canUndo || context.paused) return false
    actions.undo()
    return true
  }
  if (context.complete || context.paused || context.overlay) return false
  if (command.kind === 'fault') {
    actions.fault()
    return true
  }
  actions.point({
    winnerSide: command.side,
    outcome: command.outcome,
    attributedPlayerId: command.attributedPlayerId,
  })
  return true
}

export const VOICE_HINT_PHRASES = [
  'ace',
  'fault',
  'winner',
  'undo',
  'pause',
  'resume',
  'skip',
  'point a',
  'point b',
  'server',
  'receiver',
] as const
