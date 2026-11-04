/**
 * Subtle between-point clock: 25s countdown after each scored point.
 * Not an overlay — UI shows remaining seconds next to the next-serve line.
 */
import { useEffect, useRef, useState } from 'react'

export const BETWEEN_POINT_SECONDS = 25

/** Remaining whole seconds, or null when the clock is hidden. */
export function useBetweenPointTimer(args: {
  eventCount: number | undefined
  /** When false (paused / complete), the clock is cleared. */
  active?: boolean
}): number | null {
  const { eventCount, active = true } = args
  const [remaining, setRemaining] = useState<number | null>(null)
  const prevCountRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (eventCount == null) return
    if (!active) {
      setRemaining(null)
      prevCountRef.current = eventCount
      return
    }
    const prev = prevCountRef.current
    prevCountRef.current = eventCount
    if (prev == null) return
    if (eventCount > prev) {
      setRemaining(BETWEEN_POINT_SECONDS)
      return
    }
    if (eventCount < prev) {
      setRemaining(null)
    }
  }, [eventCount, active])

  const running = remaining != null

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRemaining((current) => {
        if (current == null || current <= 1) return null
        return current - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  return remaining
}
