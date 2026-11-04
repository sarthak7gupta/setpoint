import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { LiveRecapOverlay } from '../components/LiveRecapOverlay'
import { LiveStatsOverlay } from '../components/LiveStatsOverlay'
import { MatchClock } from '../components/MatchClock'
import { PressureCallout } from '../components/PressureCallout'
import { ServeReceiveStrip } from '../components/ServeReceiveStrip'
import { TvScoreboard } from '../components/TvScoreboard'
import { getServeInfo, playersOnSide, type Side } from '../engine'
import { getPressureSituation } from '../engine/pressure'
import { useBigScreenLandscape } from '../hooks/useBigScreenLandscape'
import { useWatchClient } from '../hooks/useWatchClient'
import { useT } from '../i18n/useT'
import { Button, Page, Row } from '../styles/ui'

const LiveShell = styled(Page)<{ $big?: boolean; $forceLandscape?: boolean }>`
  ${(p) =>
    p.$big &&
    css`
      max-width: min(1100px, 100%);
      @media (min-width: 760px) and (orientation: landscape) {
        max-width: min(1200px, 100%);
      }
    `}
  ${(p) =>
    p.$forceLandscape &&
    css`
      position: fixed;
      z-index: 40;
      top: 0;
      left: 100%;
      width: 100dvh;
      height: 100dvw;
      max-width: none;
      margin: 0;
      overflow: auto;
      overscroll-behavior: none;
      -webkit-overflow-scrolling: touch;
      transform: rotate(90deg);
      transform-origin: top left;
      box-sizing: border-box;
      padding-top: max(1rem, env(safe-area-inset-left));
      padding-bottom: max(1.5rem, env(safe-area-inset-right));
      padding-left: max(0px, env(safe-area-inset-top));
      padding-right: max(0px, env(safe-area-inset-bottom));
    `}
`

const Banner = styled.p<{ $warn?: boolean }>`
  text-align: center;
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${(p) => (p.$warn ? 'var(--warning)' : 'var(--text-muted)')};
`

export function WatchLive() {
  const t = useT()
  const [params] = useSearchParams()
  const url = params.get('src')
  const { snapshot, status } = useWatchClient(url)
  const [statsOpen, setStatsOpen] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const { bigScreen, forceLandscapeCss, toggleBigScreen } = useBigScreenLandscape()

  const nameOf = useMemo(() => {
    const names = snapshot?.playerNames ?? {}
    return (id: string) => names[id] ?? id
  }, [snapshot])

  if (!url) {
    return (
      <Page>
        <Button as={Link} to="/watch" $variant="ghost" style={{ textDecoration: 'none' }}>
          {t('watch.back')}
        </Button>
        <p>{t('watch.failed')}</p>
      </Page>
    )
  }

  if (!snapshot) {
    return (
      <Page>
        <Button as={Link} to="/watch" $variant="ghost" style={{ textDecoration: 'none' }}>
          {t('watch.back')}
        </Button>
        <p style={{ color: 'var(--text-muted)' }}>
          {status === 'lost' ? t('watch.failed') : t('watch.connecting')}
        </p>
      </Page>
    )
  }

  const { state } = snapshot
  const serve = getServeInfo(state)
  const pressure = getPressureSituation(state)
  const overlay = state.pausedAt
    ? t('watch.hostPaused')
    : state.pendingOverlay === 'warmup'
      ? t('live.warmup')
      : state.pendingOverlay === 'changeover'
        ? t('live.changeover')
        : state.pendingOverlay === 'ball_change'
          ? t('live.ballChange')
          : state.pendingOverlay === 'set_break'
            ? t('live.setBreak')
            : state.pendingOverlay === 'match_end' || state.isComplete
              ? t('watch.final')
              : null

  return (
    <LiveShell
      $big={bigScreen}
      $forceLandscape={forceLandscapeCss}
      data-testid="watch-live"
      data-force-landscape={forceLandscapeCss ? 'true' : 'false'}
    >
      <Row
        style={{ justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}
      >
        <Button as={Link} to="/watch" $variant="ghost" style={{ textDecoration: 'none' }}>
          {t('watch.back')}
        </Button>
        <MatchClock state={state} />
        <span style={{ width: '4.5rem' }} />
      </Row>

      <Banner $warn={status === 'lost'} data-testid="watch-banner">
        {status === 'lost' ? t('watch.disconnected') : t('watch.viewOnly')}
        {' · '}
        {state.isComplete ? t('watch.final') : t('watch.live')}
      </Banner>

      <ServeReceiveStrip serve={serve} nameOf={nameOf} secondServe={state.isSecondServe} />
      {pressure && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <PressureCallout situation={pressure} />
        </div>
      )}
      <p
        style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          marginTop: 0,
          marginBottom: '0.85rem',
        }}
      >
        {t('live.next')} <strong style={{ color: 'var(--serve)' }}>{nameOf(serve.serverId)}</strong>{' '}
        {t('live.servesTo')}{' '}
        <strong style={{ color: 'var(--receive)' }}>{nameOf(serve.receiverId)}</strong>
        {overlay ? ` · ${overlay}` : ''}
      </p>

      <TvScoreboard
        state={state}
        serve={serve}
        nameOf={nameOf}
        theme={snapshot.theme}
        size={bigScreen ? 'big' : 'normal'}
      />

      <div style={{ marginTop: '1.25rem' }}>
        <Button
          type="button"
          $variant="ghost"
          onClick={() => setMoreOpen((open) => !open)}
          data-testid="watch-more"
          style={{ fontSize: '0.8rem', opacity: 0.55, padding: '0.35rem 0.6rem' }}
        >
          {moreOpen ? t('live.less') : t('live.more')}
        </Button>
        {moreOpen && (
          <div
            style={{
              marginTop: '0.4rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.4rem',
            }}
          >
            <Button
              type="button"
              $variant="ghost"
              data-testid="watch-open-stats"
              onClick={() => {
                setStatsOpen(true)
                setMoreOpen(false)
              }}
            >
              {t('live.stats')}
            </Button>
            <Button
              type="button"
              $variant="ghost"
              data-testid="watch-open-recap"
              onClick={() => {
                setRecapOpen(true)
                setMoreOpen(false)
              }}
            >
              {t('live.recap')}
            </Button>
            <Button
              type="button"
              $variant={bigScreen ? 'accent' : 'ghost'}
              data-testid="watch-toggle-big"
              onClick={() => {
                toggleBigScreen()
                setMoreOpen(false)
              }}
            >
              {bigScreen ? t('live.exitBigScreen') : t('live.bigScreen')}
            </Button>
          </div>
        )}
      </div>

      {statsOpen && (
        <LiveStatsOverlay state={state} nameOf={nameOf} onClose={() => setStatsOpen(false)} />
      )}
      {recapOpen && (
        <LiveRecapOverlay
          state={state}
          nameOf={nameOf}
          sideName={(side: Side) => playersOnSide(state.config, side).map(nameOf).join(' / ')}
          onClose={() => setRecapOpen(false)}
        />
      )}
    </LiveShell>
  )
}
