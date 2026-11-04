import { Dialog } from './Dialog'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import styled from 'styled-components/native'
import { useT } from '../i18n/useT'
import { AppButton, OverlayBackdrop, OverlayCard, OverlaySub, OverlayTitle, Row } from '../styles/ui'

const Timer = styled.Text`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 56px;
  margin-bottom: 16px;
  color: ${(p) => p.theme.accentSoft};
`

interface BreakOverlayProps {
  title: string
  subtitle: string
  initialSeconds: number
  onSkip: () => void
  onUndo?: () => void
  canUndo?: boolean
  allowEdit?: boolean
  showTimer?: boolean
  skipLabel?: string
  onRematch?: () => void
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
    const id = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [running, seconds])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <Dialog
      visible
      transparent
      animationType="fade"
      onRequestClose={onSkip}
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    >
      <OverlayBackdrop>
        <OverlayCard>
          <OverlayTitle>{title}</OverlayTitle>
          <OverlaySub>{subtitle}</OverlaySub>
          {showTimer && <Timer>{mm}:{ss}</Timer>}
          <Row $gap={8} $wrap style={{ justifyContent: 'center' }}>
            {allowEdit && showTimer && (
              <>
                <AppButton variant="ghost" onPress={() => setSeconds((s) => s + 30)}>
                  {t('overlay.plus30')}
                </AppButton>
                <AppButton variant="ghost" onPress={() => setSeconds((s) => Math.max(0, s - 30))}>
                  {t('overlay.minus30')}
                </AppButton>
                <AppButton variant="ghost" onPress={() => setRunning((r) => !r)}>
                  {running ? t('overlay.pause') : t('overlay.resume')}
                </AppButton>
              </>
            )}
            {onUndo && (
              <AppButton variant="ghost" onPress={onUndo} disabled={!canUndo} testID="overlay-undo">
                {t('overlay.undo')}
              </AppButton>
            )}
            {onRematch && (
              <AppButton variant="accent" onPress={onRematch} testID="rematch-btn">
                {t('summary.rematch')}
              </AppButton>
            )}
            <AppButton variant="primary" onPress={onSkip} testID="overlay-skip">
              {skipLabel ?? (seconds === 0 ? t('overlay.continue') : t('overlay.skip'))}
            </AppButton>
            {onStats && (
              <AppButton variant="ghost" onPress={onStats} testID="overlay-stats">
                {t('live.stats')}
              </AppButton>
            )}
            {voiceToggle}
          </Row>
        </OverlayCard>
      </OverlayBackdrop>
    </Dialog>
  )
}
