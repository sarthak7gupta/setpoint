import type { TimeOfDay } from '../engine/types'

/** 6–12 morning, 12–15 afternoon, 15–21 evening, 21–6 night */
export function timeOfDayFromDate(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 15) return 'afternoon'
  if (hour >= 15 && hour < 21) return 'evening'
  return 'night'
}
