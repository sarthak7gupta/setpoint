import { act, renderHook, waitFor } from '@testing-library/react'
import { type ReactNode, StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { freshSingles } from '../../shared/engine/testHelpers'
import { createUseMatchController } from '../../shared/hooks/matchController'
import type { MatchRecord } from '../../shared/records'

function record(id = 'm'): MatchRecord {
  const state = freshSingles()
  return {
    id,
    createdAt: 1,
    updatedAt: 1,
    config: state.config,
    metadata: state.metadata,
    state,
    playerNames: { p1: 'A', p2: 'B' },
  }
}
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('match controller session', () => {
  it('commits exactly once under StrictMode and keeps rapid commands ordered', async () => {
    const saveMatch = vi.fn().mockResolvedValue(undefined)
    const useController = createUseMatchController({ getMatch: async () => record(), saveMatch })
    const { result } = renderHook(() => useController('m'), {
      wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>,
    })
    await waitFor(() => expect(result.current.state).not.toBeNull())
    act(() => {
      result.current.point({ winnerSide: 'a', outcome: 'other' })
      result.current.point({ winnerSide: 'b', outcome: 'other' })
    })
    await act(async () => {
      await result.current.flushPersist()
    })
    expect(saveMatch).toHaveBeenCalledTimes(2)
    expect(result.current.state?.events).toHaveLength(2)
    act(() => result.current.undo())
    expect(result.current.state?.events).toHaveLength(1)
    act(() => result.current.undo())
    expect(result.current.state?.events).toHaveLength(0)
    expect(result.current.canUndo).toBe(false)
  })
  it('rejects stale loads and clears an actionable match during navigation', async () => {
    const a = deferred<MatchRecord>(),
      b = deferred<MatchRecord>()
    const useController = createUseMatchController({
      getMatch: (id) => (id === 'a' ? a.promise : b.promise),
      saveMatch: vi.fn(),
    })
    const { result, rerender } = renderHook(({ id }) => useController(id), {
      initialProps: { id: 'a' },
    })
    rerender({ id: 'b' })
    await act(async () => {
      b.resolve(record('b'))
    })
    await act(async () => {
      a.resolve(record('a'))
    })
    expect(result.current.record?.id).toBe('b')
  })
  it('exposes save rejection, then retries the complete latest snapshot', async () => {
    const saveMatch = vi.fn().mockRejectedValueOnce(new Error('disk')).mockResolvedValue(undefined)
    const useController = createUseMatchController({ getMatch: async () => record(), saveMatch })
    const { result } = renderHook(() => useController('m'))
    await waitFor(() => expect(result.current.state).not.toBeNull())
    act(() => result.current.fault())
    await act(async () => {
      await expect(result.current.flushPersist()).rejects.toThrow('disk')
    })
    expect(result.current.saveStatus).toBe('error')
    act(() => result.current.retrySave())
    await act(async () => {
      await result.current.flushPersist()
    })
    expect(result.current.saveStatus).toBe('saved')
    expect(saveMatch.mock.calls[1][0].state.isSecondServe).toBe(true)
  })
})
