import { describe, expect, it } from 'vitest'
import { createId } from './helpers'

describe('createId', () => {
  it('returns a unique non-empty id', () => {
    const a = createId()
    const b = createId()
    expect(a.length).toBeGreaterThan(8)
    expect(a).not.toBe(b)
  })
})
