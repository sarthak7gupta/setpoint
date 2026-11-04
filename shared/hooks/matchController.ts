/**
 * Live-match controller: load/persist records, scoring actions, undo stack.
 *
 * Platform apps inject their store (`getMatch` / `saveMatch`). Undo stores
 * clones of `MatchState` (max 200 in memory, 50 persisted). Overlay skip and
 * pause/resume do **not** push history.
 * @see docs/ENGINE.md
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyFault,
  applyPoint,
  applyWalkover,
  cloneState,
  createMatch,
  dismissOverlay,
  getServeInfo,
  type MatchConfig,
  type MatchMetadata,
  type MatchState,
  type PointInput,
  type Side,
  startWarmup,
} from '../engine'
import { createId } from '../engine/helpers'
import type { MatchRecord } from '../records'
import {
  applyLiveMatchSettingsToState,
  type LiveMatchSettings,
  stampLiveSettingsOnHistory,
} from '../utils/matchMetadata'

const UNDO_MEMORY_MAX = 200
const UNDO_PERSIST_MAX = 50

export type MatchControllerStore = {
  getMatch: (id: string) => Promise<MatchRecord | undefined | null>
  saveMatch: (record: MatchRecord) => Promise<unknown>
}

export function createUseMatchController(store: MatchControllerStore) {
  return function useMatchController(matchId: string | undefined) {
    const [view, setView] = useState<{
      record: MatchRecord | null
      status: 'loading' | 'ready' | 'missing' | 'error'
      saveStatus: 'saved' | 'saving' | 'error'
      historyLen: number
    }>({ record: null, status: 'loading', saveStatus: 'saved', historyLen: 0 })
    const session = useRef<{ record: MatchRecord | null; history: MatchState[] }>({
      record: null,
      history: [],
    })
    const tail = useRef<Promise<void>>(Promise.resolve())
    const generation = useRef(0)
    const [reload, setReload] = useState(0)
    const [servePulse, setServePulse] = useState(false)
    const pulseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    useEffect(() => {
      const token = ++generation.current
      session.current = { record: null, history: [] }
      setView({ record: null, status: 'loading', saveStatus: 'saved', historyLen: 0 })
      void store.getMatch(matchId ?? '').then(
        (record) => {
          if (generation.current !== token) return
          const history = (record?.undoHistory ?? []).map(cloneState).slice(-UNDO_MEMORY_MAX)
          session.current = { record: record ?? null, history }
          setView({
            record: record ?? null,
            status: record ? 'ready' : 'missing',
            saveStatus: 'saved',
            historyLen: history.length,
          })
        },
        () => {
          if (generation.current === token)
            setView({ record: null, status: 'error', saveStatus: 'saved', historyLen: 0 })
        },
      )
      return () => {
        generation.current++
        clearTimeout(pulseTimer.current)
      }
    }, [matchId, reload])

    // Commands run outside React updaters. A command updates this session exactly
    // once, even when React replays rendering or batches multiple inputs.
    const persist = useCallback((next: MatchState) => {
      const current = session.current
      if (!current.record) return
      const token = generation.current
      const updated: MatchRecord = {
        ...current.record,
        config: next.config,
        metadata: next.metadata,
        state: next,
        undoHistory: next.isComplete
          ? []
          : current.history.slice(-UNDO_PERSIST_MAX).map(cloneState),
        updatedAt: Date.now(),
        completedAt: next.isComplete ? (current.record.completedAt ?? Date.now()) : undefined,
      }
      const changedServer = current.record.state.serverId !== next.serverId
      current.record = updated
      setView({
        record: updated,
        status: 'ready',
        saveStatus: 'saving',
        historyLen: current.history.length,
      })
      if (changedServer) {
        clearTimeout(pulseTimer.current)
        setServePulse(true)
        pulseTimer.current = setTimeout(() => setServePulse(false), 1200)
      }
      // A failed save must not poison the queue; its failure remains observable
      // until a later complete snapshot is successfully saved or retried.
      const done = tail.current
        .catch(() => {})
        .then(() => store.saveMatch(updated))
        .then(() => {})
      tail.current = done
      void done.then(
        () => {
          if (generation.current === token && tail.current === done)
            setView((v) => ({ ...v, saveStatus: 'saved' }))
        },
        () => {
          if (generation.current === token && tail.current === done)
            setView((v) => ({ ...v, saveStatus: 'error' }))
        },
      )
    }, [])
    const transition = useCallback(
      (change: (state: MatchState) => MatchState, undoable = false) => {
        const current = session.current
        if (!current.record || current.record.id !== matchId) return
        const state = current.record.state
        const next = change(state)
        if (next === state) return
        if (undoable)
          current.history = [...current.history, cloneState(state)].slice(-UNDO_MEMORY_MAX)
        persist(next)
      },
      [matchId, persist],
    )
    const point = useCallback(
      (input: PointInput) => transition((s) => (s.pausedAt ? s : applyPoint(s, input)), true),
      [transition],
    )
    const fault = useCallback(
      () => transition((s) => (s.pausedAt ? s : applyFault(s)), true),
      [transition],
    )
    const skipOverlay = useCallback(
      () =>
        transition((s) =>
          s.pendingOverlay === 'none' || s.pendingOverlay === 'match_end' ? s : dismissOverlay(s),
        ),
      [transition],
    )
    const beginWarmup = useCallback(() => transition(startWarmup), [transition])
    const undo = useCallback(() => {
      const current = session.current
      if (!current.record || current.record.id !== matchId || current.record.state.pausedAt) return
      const prev = current.history.pop()
      if (prev) persist(prev)
    }, [matchId, persist])
    const pause = useCallback(
      () =>
        transition((s) =>
          s.isComplete || s.pausedAt
            ? s
            : {
                ...s,
                awayAt: undefined,
                pausedAt: Date.now(),
                pausedMs: (s.pausedMs ?? 0) + (s.awayAt ? Math.max(0, Date.now() - s.awayAt) : 0),
              },
        ),
      [transition],
    )
    const resume = useCallback(
      () =>
        transition((s) =>
          !s.pausedAt
            ? s
            : {
                ...s,
                pausedAt: undefined,
                awayAt: undefined,
                pausedMs: (s.pausedMs ?? 0) + Math.max(0, Date.now() - s.pausedAt),
              },
        ),
      [transition],
    )
    const markAway = useCallback(
      () =>
        transition((s) =>
          s.isComplete || s.pausedAt || s.awayAt ? s : { ...s, awayAt: Date.now() },
        ),
      [transition],
    )
    const clearAway = useCallback(
      () =>
        transition((s) =>
          !s.awayAt
            ? s
            : {
                ...s,
                awayAt: undefined,
                pausedMs: (s.pausedMs ?? 0) + Math.max(0, Date.now() - s.awayAt),
              },
        ),
      [transition],
    )
    const updateLiveSettings = useCallback(
      (settings: LiveMatchSettings) =>
        transition((s) => {
          const next = applyLiveMatchSettingsToState(s, settings)
          session.current.history = stampLiveSettingsOnHistory(
            session.current.history,
            next.config,
            next.metadata,
          )
          return next
        }),
      [transition],
    )
    const walkover = useCallback(
      (winnerSide: Side) => transition((s) => applyWalkover(s, { winnerSide }), true),
      [transition],
    )
    const flushPersist = useCallback(() => tail.current, [])
    const retrySave = useCallback(() => {
      if (session.current.record && session.current.record.id === matchId)
        persist(session.current.record.state)
    }, [matchId, persist])
    const retryLoad = useCallback(() => setReload((n) => n + 1), [])
    const record = view.record?.id === matchId ? view.record : null
    const state = record?.state ?? null
    return {
      record,
      state,
      serve: state ? getServeInfo(state) : null,
      servePulse,
      point,
      fault,
      skipOverlay,
      beginWarmup,
      undo,
      canUndo: !!record && view.historyLen > 0,
      pause,
      resume,
      markAway,
      clearAway,
      updateLiveSettings,
      walkover,
      flushPersist,
      loadStatus: record ? view.status : view.record ? 'loading' : view.status,
      saveStatus: view.saveStatus,
      retrySave,
      retryLoad,
    }
  }
}

export function createStartNewMatch(store: MatchControllerStore) {
  return async function startNewMatch(args: {
    config: MatchConfig
    metadata: MatchMetadata
    playerNames: Record<string, string>
  }): Promise<MatchRecord> {
    const state = createMatch(args.config, args.metadata)
    const record: MatchRecord = {
      id: createId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      config: args.config,
      metadata: args.metadata,
      state,
      playerNames: args.playerNames,
      undoHistory: [],
    }
    await store.saveMatch(record)
    return record
  }
}
