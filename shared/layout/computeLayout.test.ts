import { describe, expect, it } from 'vitest'
import { computeLayout } from './computeLayout'

describe('computeLayout', () => {
  it('keeps phones single-pane', () => {
    const layout = computeLayout({ width: 390, height: 844 })
    expect(layout.isTablet).toBe(false)
    expect(layout.twoPane).toBe(false)
    expect(layout.contentMaxWidth).toBe(560)
    expect(layout.statColumns).toBe(2)
    expect(layout.historyColumns).toBe(1)
  })

  it('enables two-pane on wide tablets', () => {
    const layout = computeLayout({ width: 1024, height: 768 })
    expect(layout.isTablet).toBe(true)
    expect(layout.isLandscape).toBe(true)
    expect(layout.twoPane).toBe(true)
    expect(layout.contentMaxWidth).toBe(1024)
    expect(layout.statColumns).toBe(3)
    expect(layout.historyColumns).toBe(2)
    expect(layout.themeColumns).toBe(2)
  })

  it('uses four stat columns on large canvases', () => {
    const layout = computeLayout({ width: 1200, height: 800 })
    expect(layout.statColumns).toBe(4)
    expect(layout.historyColumns).toBe(3)
  })
})
