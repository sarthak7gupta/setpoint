import { useCallback, useEffect, useRef, useState } from 'react'
import type { MatchState } from '../engine'
import {
  buildWristBoard,
  idleWristBoard,
  parseWristCommand,
  wristBoardToMessage,
  wristCommandToVoice,
  type WristBoard,
} from '../../../shared/wrist'
import {
  dispatchVoiceCommand,
  type VoiceCommandActions,
  type VoiceCommandContext,
} from '../utils/voiceCommand'
import {
  pushWristBoard,
  subscribeWristMessages,
  wristBridgeAvailable,
  wristPaired,
  wristReachable,
} from '../wrist/bridge'

export function useWristCompanion(args: {
  enabled: boolean
  matchId: string | undefined
  state: MatchState | null
  nameOf: (id: string) => string
  canUndo: boolean
  actions: VoiceCommandActions
}) {
  const available = wristBridgeAvailable()
  const [paired, setPaired] = useState(false)
  const [reachable, setReachable] = useState(false)
  const [lastBoard, setLastBoard] = useState<WristBoard | null>(null)
  const actionsRef = useRef(args.actions)
  const stateRef = useRef(args.state)
  const canUndoRef = useRef(args.canUndo)
  actionsRef.current = args.actions
  stateRef.current = args.state
  canUndoRef.current = args.canUndo

  useEffect(() => {
    if (!available) return
    let cancelled = false
    const tick = async () => {
      const [p, r] = await Promise.all([wristPaired(), wristReachable()])
      if (!cancelled) {
        setPaired(p)
        setReachable(r)
      }
    }
    void tick()
    const id = setInterval(() => void tick(), 4000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [available])

  useEffect(() => {
    if (!available || !args.enabled) {
      void pushWristBoard(wristBoardToMessage(idleWristBoard()))
      setLastBoard(idleWristBoard())
      return
    }
    if (!args.matchId || !args.state) return
    const board = buildWristBoard({
      matchId: args.matchId,
      state: args.state,
      nameOf: args.nameOf,
      canUndo: args.canUndo,
      active: true,
    })
    setLastBoard(board)
    void pushWristBoard(wristBoardToMessage(board))
  }, [available, args.enabled, args.matchId, args.state, args.nameOf, args.canUndo])

  useEffect(() => {
    if (!available) return
    return subscribeWristMessages((raw) => {
      const command = parseWristCommand(raw)
      if (!command) return
      const state = stateRef.current
      if (!state) return
      const context: VoiceCommandContext = {
        paused: Boolean(state.pausedAt),
        overlay: state.pendingOverlay !== 'none',
        complete: state.isComplete,
        canUndo: canUndoRef.current,
      }
      dispatchVoiceCommand({
        command: wristCommandToVoice(command),
        context,
        actions: actionsRef.current,
      })
    })
  }, [available])

  const refresh = useCallback(async () => {
    if (!available) return
    setPaired(await wristPaired())
    setReachable(await wristReachable())
  }, [available])

  return {
    available,
    paired,
    reachable,
    board: lastBoard,
    refresh,
  }
}
