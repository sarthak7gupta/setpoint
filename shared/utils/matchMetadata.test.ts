import { describe, expect, it } from 'vitest'
import { freshSingles, winGame } from '../engine/testHelpers'
import type { MatchRecord } from '../records'
import {
  applyLiveMatchSettings,
  applyLiveMatchSettingsToState,
  liveMatchSettingsFrom,
  stampLiveSettingsOnHistory,
  withMatchMetadata,
} from './matchMetadata'

describe('withMatchMetadata', () => {
  it('updates record and state metadata together', () => {
    const state = freshSingles()
    const record: MatchRecord = {
      id: 'm1',
      createdAt: 1,
      updatedAt: 1,
      config: state.config,
      metadata: state.metadata,
      state,
      playerNames: { p1: 'Ada', p2: 'Bea' },
    }
    const next = withMatchMetadata({
      record,
      metadata: {
        date: '2026-09-01',
        timeOfDay: 'morning',
        weather: 'Windy',
        courtSurface: 'clay',
        notes: record.metadata.notes,
      },
      updatedAt: 99,
    })
    expect(next.updatedAt).toBe(99)
    expect(next.metadata.date).toBe('2026-09-01')
    expect(next.metadata.timeOfDay).toBe('morning')
    expect(next.metadata.weather).toBe('Windy')
    expect(next.metadata.courtSurface).toBe('clay')
    expect(next.state.metadata).toEqual(next.metadata)
    expect(next.state.events).toBe(record.state.events)
  })
})

describe('live match settings', () => {
  it('patches timers and details without touching scoring rules', () => {
    const state = freshSingles({ bestOf: 5, tiebreakPoints: 7 })
    const settings = {
      ...liveMatchSettingsFrom(state),
      breakDurationSeconds: 60,
      changeoverDurationSeconds: 45,
      warmupDurationSeconds: 180,
      ballChangeEnabled: false,
      weather: 'Humid',
      courtSurface: 'clay' as const,
      notes: 'Club night',
    }
    const next = applyLiveMatchSettingsToState(state, settings)
    expect(next.config.breakDurationSeconds).toBe(60)
    expect(next.config.changeoverDurationSeconds).toBe(45)
    expect(next.config.warmupDurationSeconds).toBe(180)
    expect(next.config.ballChangeEnabled).toBe(false)
    expect(next.metadata.weather).toBe('Humid')
    expect(next.metadata.courtSurface).toBe('clay')
    expect(next.metadata.notes).toBe('Club night')
    expect(next.config.bestOf).toBe(5)
    expect(next.config.tiebreakPoints).toBe(7)
    expect(next.config.format).toBe('singles')
    expect(next.currentGame).toEqual(state.currentGame)
    expect(next.events).toBe(state.events)
  })

  it('keeps record config in sync and stamps undo history', () => {
    const state = freshSingles()
    const record: MatchRecord = {
      id: 'm1',
      createdAt: 1,
      updatedAt: 1,
      config: state.config,
      metadata: state.metadata,
      state,
      playerNames: { p1: 'Ada', p2: 'Bea' },
    }
    const updated = applyLiveMatchSettings({
      record,
      settings: { ...liveMatchSettingsFrom(state), breakDurationSeconds: 75 },
      updatedAt: 50,
    })
    expect(updated.config.breakDurationSeconds).toBe(75)
    expect(updated.state.config.breakDurationSeconds).toBe(75)
    const history = stampLiveSettingsOnHistory(
      [state],
      updated.state.config,
      updated.state.metadata,
    )
    expect(history[0].config.breakDurationSeconds).toBe(75)
    expect(history[0].currentGame).toEqual(state.currentGame)
  })

  it('clears a timer overlay when that duration is set to 0', () => {
    const state = winGame(freshSingles(), 'a')
    expect(state.pendingOverlay).toBe('changeover')
    const next = applyLiveMatchSettingsToState(state, {
      ...liveMatchSettingsFrom(state),
      changeoverDurationSeconds: 0,
    })
    expect(next.pendingOverlay).toBe('none')
    expect(next.sets[0].gamesA).toBe(1)
  })
})
