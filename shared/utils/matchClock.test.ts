import { describe, expect, it } from 'vitest'
import { freshSingles } from '../engine/testHelpers'
import { formatMatchClock, matchElapsedMs, matchStartedAt } from './matchClock'

describe('formatMatchClock', () => {
  it('formats under / over an hour', () => {
    expect(formatMatchClock(0)).toBe('0:00')
    expect(formatMatchClock(65_000)).toBe('1:05')
    expect(formatMatchClock(3_661_000)).toBe('1:01:01')
  })
})

describe('matchElapsedMs', () => {
  it('counts from startedAt and freezes at finishedAt', () => {
    const s = {
      ...freshSingles(),
      startedAt: 1_000,
      isComplete: true,
      finishedAt: 61_000,
    }
    expect(matchStartedAt(s)).toBe(1_000)
    expect(matchElapsedMs(s, { now: 999_000 })).toBe(60_000)
    expect(formatMatchClock(matchElapsedMs(s))).toBe('1:00')
  })

  it('keeps running while live', () => {
    const s = { ...freshSingles(), startedAt: 1_000 }
    expect(matchElapsedMs(s, { now: 11_000 })).toBe(10_000)
  })

  it('freezes during an open pause and subtracts accumulated pause time', () => {
    const s = {
      ...freshSingles(),
      startedAt: 1_000,
      pausedAt: 6_000,
      pausedMs: 2_000,
    }
    expect(matchElapsedMs(s, { now: 99_000 })).toBe(3_000)
  })

  it('freezes while the live screen is away', () => {
    const s = {
      ...freshSingles(),
      startedAt: 1_000,
      awayAt: 8_000,
      pausedMs: 1_000,
    }
    expect(matchElapsedMs(s, { now: 99_000 })).toBe(6_000)
  })
})
