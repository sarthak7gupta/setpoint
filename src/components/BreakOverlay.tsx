import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useT } from '../i18n/useT'
import { Button, Overlay, OverlayCard, Row } from '../styles/ui'

interface BreakOverlayProps {
  title: string
  subtitle: string
  initialSeconds: number
  onSkip: () => void
  onUndo?: () => void
  canUndo?: boolean
  allowEdit?: boolean
  /** Hide the countdown (match end is not a timed break). */
  showTimer?: boolean
  skipLabel?: string
  onRematch?: () => void
  /** Stable id for this overlay instance — changing it resets the timer. */
  instanceKey: string
  /** Fired once each time the countdown reaches zero (e.g. umpire “Time”). */
  onTimeExpired?: () => void
  voiceToggle?: ReactNode
  onStats?: () => void
}

export function BreakOverlay({
  title,
  subtitle,
  initialSeconds,
  onSkip,
  onUndo,
  canUndo = false,
  allowEdit = true,
  showTimer = true,
  skipLabel,
  onRematch,
  instanceKey,
  onTimeExpired,
  voiceToggle,
  onStats,
}: BreakOverlayProps) {
  const t = useT()
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(true)
  const timeExpiredFired = useRef(false)

  useEffect(() => {
    setSeconds(initialSeconds)
    setRunning(true)
    timeExpiredFired.current = false
  }, [initialSeconds, instanceKey])

  useEffect(() => {
    if (seconds > 0) {
      timeExpiredFired.current = false
      return
    }
    if (timeExpiredFired.current) return
    timeExpiredFired.current = true
    onTimeExpired?.()
  }, [seconds, onTimeExpired])

  useEffect(() => {
    if (!running) return
    if (seconds <= 0) return
    const id = window.setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [running, seconds])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <Overlay role="dialog" aria-label={title}>
      <OverlayCard>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {showTimer && (
          <div
            className="display"
            style={{ fontSize: '3.5rem', marginBottom: '1rem', color: 'var(--accent-soft)' }}
          >
            {mm}:{ss}
          </div>
        )}
        <Row $gap="0.5rem" $wrap style={{ justifyContent: 'center' }}>
          {allowEdit && showTimer && (
            <>
              <Button type="button" $variant="ghost" onClick={() => setSeconds((s) => s + 30)}>
                {t('overlay.plus30')}
              </Button>
              <Button
                type="button"
                $variant="ghost"
                onClick={() => setSeconds((s) => Math.max(0, s - 30))}
              >
                {t('overlay.minus30')}
              </Button>
              <Button type="button" $variant="ghost" onClick={() => setRunning((r) => !r)}>
                {t(running ? 'overlay.pause' : 'overlay.resume')}
              </Button>
            </>
          )}
          {onUndo && (
            <Button
              type="button"
              $variant="ghost"
              onClick={onUndo}
              disabled={!canUndo}
              data-testid="overlay-undo"
            >
              {t('overlay.undo')}
            </Button>
          )}
          {onRematch && (
            <Button type="button" $variant="accent" onClick={onRematch} data-testid="rematch-btn">
              {t('summary.rematch')}
            </Button>
          )}
          <Button type="button" $variant="primary" onClick={onSkip} data-testid="overlay-skip">
            {skipLabel ?? t(seconds === 0 ? 'overlay.continue' : 'overlay.skip')}
          </Button>
          {onStats && (
            <Button type="button" $variant="ghost" onClick={onStats} data-testid="overlay-stats">
              {t('live.stats')}
            </Button>
          )}
          {voiceToggle}
        </Row>
      </OverlayCard>
    </Overlay>
  )
}
