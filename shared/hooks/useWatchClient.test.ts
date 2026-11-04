import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { freshSingles } from '../engine/testHelpers'
import { probeWatchUrl } from '../watch'
import { buildWatchSnapshot } from '../watch/protocol'
import { useWatchClient } from './useWatchClient'

vi.mock('../watch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../watch')>()),
  probeWatchUrl: vi.fn(),
}))
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})
it('keeps one probe in flight and clears a changed source immediately', async () => {
  vi.useFakeTimers()
  let finish!: (value: Awaited<ReturnType<typeof probeWatchUrl>>) => void
  vi.mocked(probeWatchUrl)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    .mockResolvedValue(null)
  const { result, rerender } = renderHook(({ url }) => useWatchClient(url), {
    initialProps: { url: 'a' },
  })
  await act(async () => {
    vi.advanceTimersByTime(3000)
  })
  expect(probeWatchUrl).toHaveBeenCalledTimes(1)
  const snapshot = buildWatchSnapshot({
    matchId: 'm',
    state: freshSingles(),
    playerNames: {},
    theme: 'wimbledon',
    updatedAt: 10,
  })
  await act(async () => {
    finish({ url: 'a', snapshot })
  })
  expect(result.current.snapshot?.matchId).toBe('m')
  rerender({ url: 'b' })
  expect(result.current.snapshot).toBeNull()
  await act(async () => {
    vi.advanceTimersByTime(500)
  })
  expect(result.current.snapshot).toBeNull()
})
it('does not replace a score with an older host snapshot', async () => {
  vi.useFakeTimers()
  const make = (updatedAt: number) => ({
    url: 'a',
    snapshot: buildWatchSnapshot({
      matchId: 'm',
      state: freshSingles(),
      playerNames: {},
      theme: 'wimbledon',
      updatedAt,
    }),
  })
  vi.mocked(probeWatchUrl).mockResolvedValueOnce(make(20)).mockResolvedValue(make(10))
  const { result } = renderHook(() => useWatchClient('a'))
  await act(async () => {})
  await act(async () => {
    vi.advanceTimersByTime(500)
  })
  expect(result.current.snapshot?.updatedAt).toBe(20)
})
