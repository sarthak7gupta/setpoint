import { type ReactNode } from 'react'
import styled from 'styled-components'
import {
  formatGameScore,
  formatSetScore,
  type MatchState,
  playersOnSide,
  type Side,
} from '../engine'
import { useT } from '../i18n/useT'
import { Brand, Button } from '../styles/ui'
import { Dialog } from './Dialog'
import { MatchClock } from './MatchClock'

const Splash = styled(Dialog)`
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: var(--gradient, var(--bg-deep));
`

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 28rem;
  width: 100%;
`

const PausedLabel = styled.p`
  color: var(--text-muted);
  margin: 0.5rem 0 1.6rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.85rem;
`

const SideName = styled.h2`
  font-family: var(--font-display);
  font-size: clamp(2.2rem, 8vw, 3.2rem);
  line-height: 0.95;
  margin: 0;
`

const Vs = styled.p`
  color: var(--text-muted);
  font-size: 0.95rem;
  margin: 0.5rem 0 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
`

const Score = styled.div`
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 9vw, 3.6rem);
  margin-top: 1.5rem;
  line-height: 1;
`

const ClockWrap = styled.div`
  margin: 1.25rem 0 2rem;
`

interface Props {
  state: MatchState
  nameOf: (id: string) => string
  fallbackStart?: number
  onResume: () => void
  voiceToggle?: ReactNode
  onStats?: () => void
}

export function PauseOverlay({
  state,
  nameOf,
  fallbackStart,
  onResume,
  voiceToggle,
  onStats,
}: Props) {
  const t = useT()
  const sideLabel = (side: Side) => playersOnSide(state.config, side).map(nameOf).join(' / ')
  const points = formatGameScore(state)
  const setLine = state.sets
    .filter((s) => s.completed || s.gamesA + s.gamesB > 0 || s.isTiebreak)
    .map((s) => formatSetScore(s))
    .join('   ')

  return (
    <Splash
      onDismiss={onResume}
      role="dialog"
      aria-label={t('live.paused')}
      data-testid="pause-overlay"
    >
      <Wrap>
        <Brand>SetPoint</Brand>
        <PausedLabel>{t('live.paused')}</PausedLabel>
        <SideName>{sideLabel('a')}</SideName>
        <Vs>{t('live.versus')}</Vs>
        <SideName>{sideLabel('b')}</SideName>
        <Score>{setLine || '0-0'}</Score>
        <Score>
          {points.pointsA} – {points.pointsB}
        </Score>
        <ClockWrap>
          <MatchClock state={state} fallbackStart={fallbackStart} />
        </ClockWrap>
        <Button type="button" $variant="accent" onClick={onResume} data-testid="resume-match">
          {t('overlay.resume')}
        </Button>
        {onStats && (
          <Button
            type="button"
            $variant="ghost"
            onClick={onStats}
            data-testid="overlay-stats"
            style={{ marginTop: '0.65rem' }}
          >
            {t('live.stats')}
          </Button>
        )}
        {voiceToggle}
      </Wrap>
    </Splash>
  )
}
