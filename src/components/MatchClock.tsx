import { useEffect, useState } from 'react'
import type { MatchState } from '../engine'
import { useT } from '../i18n/useT'
import { formatMatchClock, matchElapsedMs } from '../utils/matchClock'

interface Props {
  state: MatchState
  /** Fallback start for older saves missing `startedAt`. */
  fallbackStart?: number
}

/** Live / frozen match duration, ticks once per second while the match is open. */
export function MatchClock({ state, fallbackStart }: Props) {
  const t = useT()
  const [now, setNow] = useState(() => Date.now())
  const frozen = state.isComplete || Boolean(state.pausedAt) || Boolean(state.awayAt)

  useEffect(() => {
    setNow(Date.now())
    if (frozen) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [frozen])

  const label = formatMatchClock(matchElapsedMs(state, { now, fallbackStart }))

  return (
    <span
      data-testid="match-clock"
      title={t('a11y.clock', { time: label })}
      aria-label={t('a11y.clock', { time: label })}
      aria-live="off"
      style={{
        fontFamily: 'var(--font-ui)',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
        fontSize: '0.9rem',
        letterSpacing: '0.04em',
        color: 'var(--text-muted)',
      }}
    >
      {label}
    </span>
  )
}
