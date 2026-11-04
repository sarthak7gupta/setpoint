import { describe, expect, it } from 'vitest'
import { createMatch, dismissOverlay, startWarmup } from './scoring'
import { freshSingles, singlesConfig, testMeta } from './testHelpers'

describe('warmup overlay', () => {
  it('starts with warmup when enabled on config', () => {
    const s = createMatch(
      singlesConfig({ warmupEnabled: true, warmupDurationSeconds: 300 }),
      testMeta,
    )
    expect(s.pendingOverlay).toBe('warmup')
    expect(dismissOverlay(s).pendingOverlay).toBe('none')
  })

  it('does not start warmup by default (tests / legacy configs)', () => {
    expect(freshSingles().pendingOverlay).toBe('none')
  })

  it('startWarmup can re-open the timer after a delay', () => {
    let s = freshSingles()
    s = startWarmup(s)
    expect(s.pendingOverlay).toBe('warmup')
    s = dismissOverlay(s)
    expect(s.pendingOverlay).toBe('none')
    s = startWarmup(s)
    expect(s.pendingOverlay).toBe('warmup')
  })

  it('startWarmup is a no-op while another overlay is showing', () => {
    let s = freshSingles()
    s = { ...s, pendingOverlay: 'changeover' }
    expect(startWarmup(s).pendingOverlay).toBe('changeover')
  })

  it('skips warmup when the timer is 0 even if the toggle is on', () => {
    const s = createMatch(
      singlesConfig({ warmupEnabled: true, warmupDurationSeconds: 0 }),
      testMeta,
    )
    expect(s.pendingOverlay).toBe('none')
    expect(startWarmup(s).pendingOverlay).toBe('none')
  })
})
