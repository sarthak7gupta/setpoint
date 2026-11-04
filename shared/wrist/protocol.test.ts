import { describe, expect, it } from 'vitest'
import { freshSingles } from '../engine/testHelpers'
import {
  buildWristBoard,
  buildWristCommand,
  parseWristCommand,
  wristBoardToMessage,
  wristCommandToVoice,
} from './protocol'

describe('wrist protocol', () => {
  it('builds a board from match state', () => {
    const state = freshSingles()
    const board = buildWristBoard({
      matchId: 'm1',
      state,
      nameOf: (id) => (id === state.config.playerIds[0] ? 'Alice' : 'Bob'),
      canUndo: false,
    })
    expect(board.protocol).toBe('setpoint-wrist')
    expect(board.kind).toBe('board')
    expect(board.labelA).toBe('Alice')
    expect(board.labelB).toBe('Bob')
    expect(board.pointsA).toBe('0')
    expect(board.pointsB).toBe('0')
    expect(board.active).toBe(true)
  })

  it('parses point / fault commands', () => {
    const point = parseWristCommand(buildWristCommand({ action: 'point', side: 'a' }))
    expect(point?.action).toBe('point')
    expect(point?.side).toBe('a')
    expect(wristCommandToVoice(point!).kind).toBe('point')

    const fault = parseWristCommand(buildWristCommand({ action: 'fault' }))
    expect(fault?.action).toBe('fault')
    expect(wristCommandToVoice(fault!).kind).toBe('fault')
  })

  it('rejects invalid payloads', () => {
    expect(parseWristCommand({ protocol: 'other', kind: 'command', action: 'point' })).toBeNull()
    expect(parseWristCommand(buildWristCommand({ action: 'point' }))).toBeNull()
  })

  it('flattens board for native dictionaries', () => {
    const state = freshSingles()
    const board = buildWristBoard({
      matchId: 'm1',
      state,
      nameOf: () => 'X',
      canUndo: true,
    })
    const msg = wristBoardToMessage(board)
    expect(msg.protocol).toBe('setpoint-wrist')
    expect(msg.canUndo).toBe(true)
  })
})
