import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BETWEEN_POINT_SECONDS, useBetweenPointTimer } from './betweenPointTimer'

describe('useBetweenPointTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not start on the initial event count', () => {
    const { result } = renderHook(({ count }) => useBetweenPointTimer({ eventCount: count }), {
      initialProps: { count: 0 },
    })
    expect(result.current).toBeNull()
  })

  it('starts at 25 after a new point and clears at zero', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useBetweenPointTimer({ eventCount: count }),
      { initialProps: { count: 0 } },
    )
    rerender({ count: 1 })
    expect(result.current).toBe(BETWEEN_POINT_SECONDS)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe(BETWEEN_POINT_SECONDS - 1)

    act(() => {
      vi.advanceTimersByTime(24_000)
    })
    expect(result.current).toBeNull()
  })

  it('restarts when another point is scored', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useBetweenPointTimer({ eventCount: count }),
      { initialProps: { count: 0 } },
    )
    rerender({ count: 1 })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current).toBe(20)

    rerender({ count: 2 })
    expect(result.current).toBe(BETWEEN_POINT_SECONDS)
  })

  it('clears on undo and when inactive', () => {
    const { result, rerender } = renderHook(
      ({ count, active }) => useBetweenPointTimer({ eventCount: count, active }),
      { initialProps: { count: 0, active: true } },
    )
    rerender({ count: 1, active: true })
    expect(result.current).toBe(BETWEEN_POINT_SECONDS)

    rerender({ count: 0, active: true })
    expect(result.current).toBeNull()

    rerender({ count: 1, active: true })
    expect(result.current).toBe(BETWEEN_POINT_SECONDS)
    rerender({ count: 1, active: false })
    expect(result.current).toBeNull()
  })
})
