/**
 * Wrist companion protocol (Apple Watch / Wear OS ↔ phone).
 * Distinct from LAN `shared/watch` (view-only Wi‑Fi scoreboard).
 */
import {
  formatGameScore,
  formatSetScore,
  type MatchState,
  playersOnSide,
  type Side,
} from '../engine'
import type { VoiceCommand } from '../utils/voiceCommand'

export const WRIST_PROTOCOL = 'setpoint-wrist' as const
export const WRIST_VERSION = 1

export type WristBoard = {
  protocol: typeof WRIST_PROTOCOL
  version: typeof WRIST_VERSION
  kind: 'board'
  matchId: string
  active: boolean
  labelA: string
  labelB: string
  pointsA: string
  pointsB: string
  sets: string
  serving: Side | null
  paused: boolean
  overlay: boolean
  complete: boolean
  canUndo: boolean
  updatedAt: number
}

export type WristAction = 'point' | 'fault' | 'undo' | 'pause' | 'resume' | 'skip'

export type WristCommand = {
  protocol: typeof WRIST_PROTOCOL
  version: typeof WRIST_VERSION
  kind: 'command'
  action: WristAction
  side?: Side
  at: number
}

export function buildWristBoard(args: {
  matchId: string
  state: MatchState
  nameOf: (id: string) => string
  canUndo: boolean
  active?: boolean
  updatedAt?: number
}): WristBoard {
  const { state } = args
  const points = formatGameScore(state)
  const sets = state.sets
    .filter((s) => s.completed || s.gamesA + s.gamesB > 0 || s.isTiebreak)
    .map((s) => formatSetScore(s))
    .join('  ')
  const labelSide = (side: Side) => playersOnSide(state.config, side).map(args.nameOf).join('/')
  const serverSide = state.serverId
    ? playersOnSide(state.config, 'a').includes(state.serverId)
      ? 'a'
      : 'b'
    : null

  return {
    protocol: WRIST_PROTOCOL,
    version: WRIST_VERSION,
    kind: 'board',
    matchId: args.matchId,
    active: args.active ?? true,
    labelA: labelSide('a'),
    labelB: labelSide('b'),
    pointsA: points.pointsA,
    pointsB: points.pointsB,
    sets,
    serving: serverSide,
    paused: Boolean(state.pausedAt),
    overlay: state.pendingOverlay !== 'none',
    complete: state.isComplete,
    canUndo: args.canUndo,
    updatedAt: args.updatedAt ?? Date.now(),
  }
}

export function idleWristBoard(updatedAt = Date.now()): WristBoard {
  return {
    protocol: WRIST_PROTOCOL,
    version: WRIST_VERSION,
    kind: 'board',
    matchId: '',
    active: false,
    labelA: '—',
    labelB: '—',
    pointsA: '',
    pointsB: '',
    sets: '',
    serving: null,
    paused: false,
    overlay: false,
    complete: false,
    canUndo: false,
    updatedAt,
  }
}

export function buildWristCommand(args: {
  action: WristAction
  side?: Side
  at?: number
}): WristCommand {
  return {
    protocol: WRIST_PROTOCOL,
    version: WRIST_VERSION,
    kind: 'command',
    action: args.action,
    ...(args.side ? { side: args.side } : {}),
    at: args.at ?? Date.now(),
  }
}

export function parseWristCommand(raw: unknown): WristCommand | null {
  if (!raw || typeof raw !== 'object') return null
  const msg = raw as Record<string, unknown>
  if (msg.protocol !== WRIST_PROTOCOL) return null
  if (msg.kind !== 'command') return null
  const action = msg.action
  if (
    action !== 'point' &&
    action !== 'fault' &&
    action !== 'undo' &&
    action !== 'pause' &&
    action !== 'resume' &&
    action !== 'skip'
  ) {
    return null
  }
  if (action === 'point') {
    if (msg.side !== 'a' && msg.side !== 'b') return null
    return {
      protocol: WRIST_PROTOCOL,
      version: WRIST_VERSION,
      kind: 'command',
      action: 'point',
      side: msg.side,
      at: typeof msg.at === 'number' ? msg.at : Date.now(),
    }
  }
  return {
    protocol: WRIST_PROTOCOL,
    version: WRIST_VERSION,
    kind: 'command',
    action,
    at: typeof msg.at === 'number' ? msg.at : Date.now(),
  }
}

export function parseWristBoard(raw: unknown): WristBoard | null {
  if (!raw || typeof raw !== 'object') return null
  const msg = raw as Record<string, unknown>
  if (msg.protocol !== WRIST_PROTOCOL || msg.kind !== 'board') return null
  if (typeof msg.matchId !== 'string') return null
  return msg as WristBoard
}

/** Map a wrist tap into the shared voice-command dispatcher shape. */
export function wristCommandToVoice(command: WristCommand): VoiceCommand {
  switch (command.action) {
    case 'point':
      return {
        kind: 'point',
        side: command.side ?? 'a',
        outcome: 'other',
      }
    case 'fault':
      return { kind: 'fault' }
    case 'undo':
      return { kind: 'undo' }
    case 'pause':
      return { kind: 'pause' }
    case 'resume':
      return { kind: 'resume' }
    case 'skip':
      return { kind: 'skip' }
    default:
      return { kind: 'unknown' }
  }
}

/** Flatten board for WatchConnectivity / Wear message dictionaries (string values safe). */
export function wristBoardToMessage(board: WristBoard): Record<string, string | number | boolean> {
  return {
    protocol: board.protocol,
    version: board.version,
    kind: board.kind,
    matchId: board.matchId,
    active: board.active,
    labelA: board.labelA,
    labelB: board.labelB,
    pointsA: board.pointsA,
    pointsB: board.pointsB,
    sets: board.sets,
    serving: board.serving ?? '',
    paused: board.paused,
    overlay: board.overlay,
    complete: board.complete,
    canUndo: board.canUndo,
    updatedAt: board.updatedAt,
  }
}

export function wristCommandToMessage(
  command: WristCommand,
): Record<string, string | number | boolean> {
  return {
    protocol: command.protocol,
    version: command.version,
    kind: command.kind,
    action: command.action,
    side: command.side ?? '',
    at: command.at,
  }
}
