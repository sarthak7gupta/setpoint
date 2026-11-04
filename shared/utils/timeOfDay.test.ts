import { describe, expect, it } from 'vitest'
import { timeOfDayFromDate } from './timeOfDay'

describe('timeOfDayFromDate', () => {
  it('maps hour ranges', () => {
    expect(timeOfDayFromDate(new Date('2026-08-31T06:00:00')).toString()).toBe('morning')
    expect(timeOfDayFromDate(new Date(2026, 7, 31, 6, 0)).toString()).toBe('morning')
    expect(timeOfDayFromDate(new Date(2026, 7, 31, 11, 59)).toString()).toBe('morning')
    expect(timeOfDayFromDate(new Date(2026, 7, 31, 12, 0)).toString()).toBe('afternoon')
    expect(timeOfDayFromDate(new Date(2026, 7, 31, 14, 59)).toString()).toBe('afternoon')
    expect(timeOfDayFromDate(new Date(2026, 7, 31, 15, 0)).toString()).toBe('evening')
    expect(timeOfDayFromDate(new Date(2026, 7, 31, 20, 59)).toString()).toBe('evening')
    expect(timeOfDayFromDate(new Date(2026, 7, 31, 21, 0)).toString()).toBe('night')
    expect(timeOfDayFromDate(new Date(2026, 7, 31, 5, 59)).toString()).toBe('night')
  })
})
