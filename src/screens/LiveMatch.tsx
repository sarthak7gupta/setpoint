import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { BreakOverlay } from '../components/BreakOverlay'
import { PauseIcon, SpeakerIcon } from '../components/controlIcons'
import { LiveRecapOverlay } from '../components/LiveRecapOverlay'
import { LiveStatsOverlay } from '../components/LiveStatsOverlay'
import { MatchClock } from '../components/MatchClock'
import { MatchLiveSettingsOverlay } from '../components/MatchLiveSettings'
import { PauseOverlay } from '../components/PauseOverlay'
import { PressureCallout } from '../components/PressureCallout'
import { ServeReceiveStrip } from '../components/ServeReceiveStrip'
import { TvScoreboard } from '../components/TvScoreboard'
import { VoiceListenButton } from '../components/VoiceListenButton'
import { WalkoverOverlay } from '../components/WalkoverOverlay'
import { useApp } from '../context/AppContext'
import {
  type MatchState,
  type PointOutcome,
  playersOnSide,
  type Side,
  warmupManualOverlayEnabled,
} from '../engine'
import { getPressureSituation } from '../engine/pressure'
import { useBigScreenLandscape } from '../hooks/useBigScreenLandscape'
import { useMatchController } from '../hooks/useMatchController'
import { useVoiceScoring } from '../hooks/useVoiceScoring'
import { useWatchHost } from '../hooks/useWatchHost'
import { useT } from '../i18n/useT'
import { Button, Page, Row, Stack } from '../styles/ui'
import { useBetweenPointTimer } from '../utils/betweenPointTimer'
import { buildLiveCallout, serveCalloutText } from '../utils/gameCallout'
import { speakScore, stopScoreSpeech } from '../utils/speakScore'
import {
  describeVoiceCommand,
  dispatchVoiceCommand,
  parseVoiceCommand,
  voicePlayersFromState,
} from '../utils/voiceCommand'
import { isPrivateIpv4 } from '../watch'

const HeaderChip = styled.button<{ $icon?: boolean; $muted?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  background: transparent;
  color: ${(p) => (p.$muted ? 'var(--text-muted)' : 'var(--text)')};
  border-radius: 999px;
  padding: ${(p) => (p.$icon ? '0' : '0.28rem 0.7rem')};
  min-width: 44px;
  width: ${(p) => (p.$icon ? '44px' : 'auto')};
  min-height: 44px;
  height: ${(p) => (p.$icon ? '44px' : 'auto')};
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const VoiceStatus = styled.p`
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8rem;
  margin: 0 0 0.75rem;
  min-height: 1.1em;
`

const BetweenPointSec = styled.span`
  margin-left: 0.55rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  opacity: 0.72;
`

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

export function LiveMatch() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const t = useT()
  const { theme, settings, locale, updateSettings } = useApp()
  const {
    record,
    state,
    serve,
    servePulse,
    point,
    fault,
    skipOverlay,
    beginWarmup,
    undo,
    canUndo,
    pause,
    resume,
    markAway,
    clearAway,
    updateLiveSettings,
    walkover,
    flushPersist,
    loadStatus,
    saveStatus,
    retrySave,
    retryLoad,
  } = useMatchController(matchId)
  const [outcome, setOutcome] = useState<PointOutcome>('other')
  const [pickPlayerFor, setPickPlayerFor] = useState<Side | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [walkoverOpen, setWalkoverOpen] = useState(false)
  const { bigScreen, forceLandscapeCss, toggleBigScreen, exitBigScreen } = useBigScreenLandscape()
  const [sharing, setSharing] = useState(true)
  const watchHost = useWatchHost({
    enabled: sharing,
    matchId,
    playerNames: record?.playerNames,
    state,
    theme,
  })
  const shareAddress =
    typeof window !== 'undefined' && isPrivateIpv4(window.location.hostname)
      ? `${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`
      : null
  const [heard, setHeard] = useState<{
    transcript: string
    label: string
    applied: boolean
  } | null>(null)
  const leavingForSummary = useRef(false)
  const prevStateRef = useRef<MatchState | null>(null)
  const speakWaitRef = useRef(Promise.resolve())
  const servedAfterTimeRef = useRef(false)

  useEffect(() => {
    clearAway()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') markAway()
      else clearAway()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      markAway()
    }
  }, [markAway, clearAway])

  const nameOf = useMemo(() => {
    const map = record?.playerNames ?? {}
    return (id: string) => map[id] ?? id.slice(0, 6)
  }, [record])

  const pressure = useMemo(() => (state ? getPressureSituation(state) : null), [state])

  useEffect(() => {
    if (!state) return
    const prev = prevStateRef.current
    prevStateRef.current = state

    const overlayCleared =
      prev != null && prev.pendingOverlay !== 'none' && state.pendingOverlay === 'none'
    if (overlayCleared && servedAfterTimeRef.current) {
      servedAfterTimeRef.current = false
      return
    }

    const line = buildLiveCallout({
      prev,
      next: state,
      nameOf,
      t,
    })
    if (line) {
      speakWaitRef.current = speakScore({
        text: line,
        locale,
        enabled: settings.voiceCalloutsEnabled,
      })
    }
  }, [state, nameOf, t, locale, settings.voiceCalloutsEnabled])

  useEffect(() => {
    if (state?.pausedAt) void stopScoreSpeech()
  }, [state?.pausedAt])

  useEffect(() => {
    if (!state?.isComplete || !record || leavingForSummary.current || saveStatus === 'error') return
    leavingForSummary.current = true
    exitBigScreen()
    const matchIdToOpen = record.id
    void flushPersist()
      .then(() => speakWaitRef.current)
      .then(() => {
        navigate(`/match/${matchIdToOpen}/summary`, { replace: true })
      })
      .catch(() => {
        leavingForSummary.current = false
      })
  }, [state?.isComplete, saveStatus, record, navigate, flushPersist, exitBigScreen])

  const onVoiceFinal = useCallback(
    (transcript: string) => {
      if (!state || !serve) return
      const command = parseVoiceCommand({
        transcript,
        players: voicePlayersFromState({ state, nameOf }),
        serverId: serve.serverId,
        receiverId: serve.receiverId,
      })
      const applied = dispatchVoiceCommand({
        command,
        context: {
          paused: Boolean(state.pausedAt),
          overlay: state.pendingOverlay !== 'none',
          complete: state.isComplete,
          canUndo,
        },
        actions: {
          point: (input) => {
            point(input)
            setPickPlayerFor(null)
            setOutcome('other')
          },
          fault,
          undo,
          pause,
          resume,
          skip: skipOverlay,
        },
      })
      setHeard({
        transcript,
        label: describeVoiceCommand({ command, nameOf }),
        applied,
      })
    },
    [state, serve, nameOf, canUndo, point, fault, undo, pause, resume, skipOverlay],
  )

  const voice = useVoiceScoring({
    enabled: Boolean(settings.voiceCommandsEnabled && state && !state.isComplete),
    locale,
    onFinal: onVoiceFinal,
    stopSpeech: stopScoreSpeech,
  })

  const mic = settings.voiceCommandsEnabled ? (
    <VoiceListenButton
      listening={voice.listening}
      supported={voice.supported}
      disabled={!state || state.isComplete}
      onToggle={voice.toggle}
      label={voice.listening ? t('live.listening') : t('live.mic')}
      title={voice.supported ? t('live.voiceHint') : t('live.voiceUnavailable')}
    />
  ) : null

  const announceTime = useCallback(() => {
    if (!state) return
    servedAfterTimeRef.current = true
    const parts = [t('callout.time')]
    if (state.pendingOverlay === 'set_break') {
      parts.push(serveCalloutText({ state, nameOf, t, withSet: true }))
    }
    void speakScore({
      text: parts.join(' '),
      locale,
      enabled: settings.voiceCalloutsEnabled,
    })
  }, [t, locale, settings.voiceCalloutsEnabled, state, nameOf])

  const betweenPointSec = useBetweenPointTimer({
    eventCount: state?.events.length,
    active: Boolean(state && !state.isComplete && !state.pausedAt),
  })

  if (!state || !record || !serve) {
    return (
      <Page>
        <p role="status">
          {t(
            loadStatus === 'error'
              ? 'common.loadFailed'
              : loadStatus === 'missing'
                ? 'common.missingMatch'
                : 'common.loading',
          )}
        </p>
        {loadStatus !== 'loading' && <Button onClick={retryLoad}>{t('common.retry')}</Button>}
        <Button as={Link} to="/app">
          {t('common.home')}
        </Button>
      </Page>
    )
  }

  const sideLabel = (side: Side) => {
    const ids = playersOnSide(state.config, side)
    return ids.map(nameOf).join(' / ')
  }

  const award = (side: Side, attributedPlayerId?: string, forcedOutcome?: PointOutcome) => {
    const finalOutcome = forcedOutcome ?? (settings.quietScoring ? 'other' : outcome)
    point({
      winnerSide: side,
      outcome: finalOutcome,
      attributedPlayerId,
    })
    setPickPlayerFor(null)
    setOutcome('other')
  }

  const onOutcomeTap = (id: PointOutcome) => {
    if (state.pendingOverlay !== 'none' || state.pausedAt) return
    if (id === 'ace') {
      award(serve.servingSide, serve.serverId, 'ace')
      return
    }
    setOutcome(id)
  }

  const onSideTap = (side: Side) => {
    if (!settings.quietScoring && outcome === 'ace') {
      award(serve.servingSide, serve.serverId, 'ace')
      return
    }
    if (
      state.config.format === 'doubles' &&
      !settings.quietScoring &&
      (outcome === 'winner' || outcome === 'unforced_error')
    ) {
      setPickPlayerFor(side)
      return
    }
    award(side)
  }

  const overlayTitle =
    state.pendingOverlay === 'warmup'
      ? t('live.warmup')
      : state.pendingOverlay === 'changeover'
        ? t('live.changeover')
        : state.pendingOverlay === 'ball_change'
          ? t('live.ballChange')
          : state.pendingOverlay === 'set_break'
            ? t('live.setBreak')
            : ''

  const overlaySeconds =
    state.pendingOverlay === 'warmup'
      ? (state.config.warmupDurationSeconds ?? 300)
      : state.pendingOverlay === 'set_break'
        ? state.config.breakDurationSeconds
        : state.pendingOverlay === 'ball_change'
          ? (state.config.ballChangeDurationSeconds ?? state.config.changeoverDurationSeconds)
          : state.config.changeoverDurationSeconds

  const ballChangeAlsoChangeover =
    state.pendingOverlay === 'ball_change' && state.gamesCompletedInSet % 2 === 1
  const shouldAnnounceTime =
    state.pendingOverlay === 'changeover' ||
    state.pendingOverlay === 'set_break' ||
    ballChangeAlsoChangeover

  const canStartWarmup =
    state.pendingOverlay === 'none' && !state.isComplete && warmupManualOverlayEnabled(state.config)

  const serverName = nameOf(serve.serverId)
  const receiverName = nameOf(serve.receiverId)
  const overlaySubtitle =
    state.pendingOverlay === 'warmup'
      ? t('live.hitNext', { server: serverName, receiver: receiverName })
      : state.pendingOverlay === 'changeover'
        ? t('live.switchNext', { server: serverName, receiver: receiverName })
        : state.pendingOverlay === 'ball_change'
          ? ballChangeAlsoChangeover
            ? t('live.ballsSwitch', { server: serverName, receiver: receiverName })
            : t('live.ballsNext', { server: serverName, receiver: receiverName })
          : t('live.nextSet', { server: serverName })

  const outcomes: { id: PointOutcome; label: string }[] = [
    { id: 'winner', label: t('live.winner') },
    { id: 'unforced_error', label: t('live.ue') },
    { id: 'ace', label: t('live.ace') },
    { id: 'other', label: t('live.point') },
  ]

  return (
    <LiveShell
      $big={bigScreen}
      $forceLandscape={forceLandscapeCss}
      data-big-screen={bigScreen ? 'true' : 'false'}
      data-force-landscape={forceLandscapeCss ? 'true' : 'false'}
    >
      <Row
        style={{ justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}
      >
        <Button
          as={Link}
          to="/app"
          $variant="ghost"
          style={{ textDecoration: 'none' }}
          onClick={() => {
            exitBigScreen()
            markAway()
          }}
        >
          {t('live.home')}
        </Button>
        <Row $gap="0.5rem" style={{ alignItems: 'center' }}>
          <MatchClock state={state} fallbackStart={record.createdAt} />
          {!state.isComplete && (
            <HeaderChip
              type="button"
              $icon
              onClick={(event) => {
                // Safari does not focus buttons on pointer activation.
                event.currentTarget.focus()
                pause()
              }}
              data-testid="pause-match"
              aria-label={t('overlay.pause')}
              title={t('overlay.pause')}
            >
              <PauseIcon />
            </HeaderChip>
          )}
          <HeaderChip
            type="button"
            $icon
            $muted={!settings.voiceCalloutsEnabled}
            onClick={() => {
              const next = !settings.voiceCalloutsEnabled
              if (!next) void stopScoreSpeech()
              void updateSettings({ voiceCalloutsEnabled: next })
            }}
            data-testid="mute-callouts"
            aria-pressed={!settings.voiceCalloutsEnabled}
            aria-label={
              settings.voiceCalloutsEnabled ? t('live.muteCallouts') : t('live.unmuteCallouts')
            }
            title={
              settings.voiceCalloutsEnabled ? t('live.muteCallouts') : t('live.unmuteCallouts')
            }
          >
            <SpeakerIcon muted={!settings.voiceCalloutsEnabled} />
          </HeaderChip>
          {mic}
        </Row>
        <Button
          type="button"
          $variant="ghost"
          onClick={undo}
          disabled={!canUndo || Boolean(state.pausedAt)}
        >
          {t('live.undo')}
        </Button>
      </Row>

      <ServeReceiveStrip
        serve={serve}
        nameOf={nameOf}
        pulse={servePulse}
        secondServe={state.isSecondServe}
      />

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
        {state.sets[state.sets.length - 1].isTiebreak ? ` · ${t('live.tiebreak')}` : ''}
        {betweenPointSec != null && (
          <BetweenPointSec data-testid="between-point-timer" aria-hidden>
            {betweenPointSec}
          </BetweenPointSec>
        )}
      </p>

      {(voice.listening || heard || voice.error) && (
        <VoiceStatus data-testid="voice-status">
          {voice.listening
            ? voice.interim || t('live.voiceHint')
            : voice.error === 'not-allowed'
              ? t('live.voiceUnavailable')
              : heard
                ? heard.applied
                  ? heard.label
                  : `${heard.label} · “${heard.transcript}”`
                : null}
        </VoiceStatus>
      )}

      <TvScoreboard
        state={state}
        serve={serve}
        nameOf={nameOf}
        theme={theme}
        size={bigScreen ? 'big' : 'normal'}
      />

      <Stack $gap="0.65rem" style={{ marginTop: bigScreen ? '1.25rem' : '1rem' }}>
        <p role="status" style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {t(
            saveStatus === 'error'
              ? 'common.saveFailed'
              : saveStatus === 'saving'
                ? 'common.saving'
                : 'common.saved',
          )}
        </p>
        {saveStatus === 'error' && <Button onClick={retrySave}>{t('common.retry')}</Button>}
        <Button
          $variant="ghost"
          aria-pressed={settings.quietScoring}
          onClick={() => {
            setOutcome('other')
            setPickPlayerFor(null)
            void updateSettings({ quietScoring: !settings.quietScoring })
          }}
        >
          {t(settings.quietScoring ? 'live.detailed' : 'live.quiet')}
        </Button>
        <Row $wrap $gap="0.4rem">
          {!settings.quietScoring &&
            outcomes.map((o) => (
              <Button
                key={o.id}
                aria-pressed={outcome === o.id}
                type="button"
                $variant={outcome === o.id ? 'accent' : 'ghost'}
                onClick={() => onOutcomeTap(o.id)}
                style={{ flex: '1 1 30%', minWidth: '4.5rem' }}
                disabled={state.pendingOverlay !== 'none' || Boolean(state.pausedAt)}
              >
                {o.label}
              </Button>
            ))}
        </Row>

        <Row $gap="0.5rem">
          <Button
            type="button"
            $variant="primary"
            style={{ flex: 1, minHeight: '4rem', fontSize: '1.05rem' }}
            onClick={() => onSideTap('a')}
            data-testid="point-a"
            disabled={state.pendingOverlay !== 'none' || Boolean(state.pausedAt)}
          >
            {t('live.pointTo', { name: sideLabel('a') })}
          </Button>
          <Button
            type="button"
            $variant="primary"
            style={{ flex: 1, minHeight: '4rem', fontSize: '1.05rem' }}
            onClick={() => onSideTap('b')}
            data-testid="point-b"
            disabled={state.pendingOverlay !== 'none' || Boolean(state.pausedAt)}
          >
            {t('live.pointTo', { name: sideLabel('b') })}
          </Button>
        </Row>

        <Button
          type="button"
          $variant={state.isSecondServe ? 'danger' : 'warning'}
          onClick={fault}
          data-testid="fault-btn"
          disabled={state.pendingOverlay !== 'none' || Boolean(state.pausedAt)}
        >
          {state.isSecondServe ? t('live.doubleFault') : t('live.fault')}
        </Button>
      </Stack>

      {pickPlayerFor && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: 14,
            border: '1px solid var(--line)',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          <p style={{ marginTop: 0 }}>{t('live.assign')}</p>
          <Row $wrap>
            <Button type="button" $variant="accent" onClick={() => award(pickPlayerFor)}>
              {t('live.teamOnly')}
            </Button>
            {playersOnSide(state.config, pickPlayerFor).map((id) => (
              <Button key={id} type="button" onClick={() => award(pickPlayerFor, id)}>
                {nameOf(id)}
              </Button>
            ))}
            <Button type="button" $variant="ghost" onClick={() => setPickPlayerFor(null)}>
              {t('common.cancel')}
            </Button>
          </Row>
        </div>
      )}

      <div style={{ marginTop: '1.25rem' }}>
        <Button
          type="button"
          $variant="ghost"
          onClick={() => setMoreOpen((open) => !open)}
          style={{
            fontSize: '0.8rem',
            opacity: 1,
            padding: '0.35rem 0.6rem',
          }}
          data-testid="more-actions"
          aria-expanded={moreOpen}
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
              onClick={() => {
                setStatsOpen(true)
                setMoreOpen(false)
              }}
              style={{ fontSize: '0.85rem', opacity: 0.75 }}
              data-testid="open-live-stats"
            >
              {t('live.stats')}
            </Button>
            <Button
              type="button"
              $variant="ghost"
              onClick={() => {
                setRecapOpen(true)
                setMoreOpen(false)
              }}
              style={{ fontSize: '0.85rem', opacity: 0.75 }}
              data-testid="open-live-recap"
            >
              {t('live.recap')}
            </Button>
            <Button
              type="button"
              $variant={bigScreen ? 'accent' : 'ghost'}
              onClick={() => {
                toggleBigScreen()
                setMoreOpen(false)
              }}
              style={{ fontSize: '0.85rem', opacity: bigScreen ? 1 : 0.75 }}
              data-testid="toggle-big-screen"
            >
              {bigScreen ? t('live.exitBigScreen') : t('live.bigScreen')}
            </Button>
            <Button
              type="button"
              $variant="ghost"
              onClick={() => {
                setSettingsOpen(true)
                setMoreOpen(false)
              }}
              style={{ fontSize: '0.85rem', opacity: 0.75 }}
              data-testid="open-live-settings"
            >
              {t('live.matchSettings')}
            </Button>
            <Button
              type="button"
              $variant="ghost"
              onClick={() => {
                setWalkoverOpen(true)
                setMoreOpen(false)
              }}
              style={{ fontSize: '0.85rem', opacity: 0.75 }}
              data-testid="open-walkover"
            >
              {t('live.walkover')}
            </Button>
            <Button
              type="button"
              $variant="ghost"
              disabled={!canStartWarmup}
              onClick={() => {
                beginWarmup()
                setMoreOpen(false)
              }}
              style={{ fontSize: '0.85rem', opacity: canStartWarmup ? 0.75 : 0.4 }}
              data-testid="start-warmup"
            >
              {t('live.startWarmup')}
            </Button>
            <Button
              type="button"
              $variant={sharing && watchHost.canPublish ? 'accent' : 'ghost'}
              onClick={() => setSharing((on) => !on)}
              style={{ fontSize: '0.85rem', opacity: 0.75 }}
              data-testid="toggle-watch-share"
            >
              {sharing ? t('watch.sharingOn') : t('watch.sharingOff')}
            </Button>
          </div>
        )}
        {moreOpen && (
          <p
            style={{
              margin: '0.55rem 0 0',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
            }}
            data-testid="watch-share-hint"
          >
            {!watchHost.checked
              ? ''
              : !watchHost.canPublish
                ? t('watch.webUnavailable')
                : sharing && watchHost.publishFailed
                  ? t('watch.publishFailed')
                  : sharing
                    ? shareAddress
                      ? t('watch.shareAddress', { address: shareAddress })
                      : t('watch.shareHint')
                    : t('watch.sharingOffHint')}
          </p>
        )}
      </div>

      {state.pausedAt && (
        <PauseOverlay
          state={state}
          nameOf={nameOf}
          fallbackStart={record.createdAt}
          onResume={resume}
          voiceToggle={mic ? <div style={{ marginTop: '0.85rem' }}>{mic}</div> : undefined}
          onStats={() => setStatsOpen(true)}
        />
      )}

      {!state.pausedAt &&
        (state.pendingOverlay === 'warmup' ||
          state.pendingOverlay === 'changeover' ||
          state.pendingOverlay === 'ball_change' ||
          state.pendingOverlay === 'set_break') && (
          <BreakOverlay
            title={overlayTitle}
            subtitle={overlaySubtitle}
            initialSeconds={overlaySeconds}
            instanceKey={`${state.pendingOverlay}-${state.events.length}-${state.sets.length}-${state.startedAt}`}
            onSkip={skipOverlay}
            onUndo={undo}
            canUndo={canUndo}
            onTimeExpired={shouldAnnounceTime ? announceTime : undefined}
            voiceToggle={mic}
            onStats={() => setStatsOpen(true)}
          />
        )}

      {statsOpen && (
        <LiveStatsOverlay state={state} nameOf={nameOf} onClose={() => setStatsOpen(false)} />
      )}
      {recapOpen && (
        <LiveRecapOverlay
          state={state}
          nameOf={nameOf}
          sideName={sideLabel}
          onClose={() => setRecapOpen(false)}
        />
      )}
      {settingsOpen && (
        <MatchLiveSettingsOverlay
          state={state}
          sideName={sideLabel}
          onSave={updateLiveSettings}
          onWalkover={walkover}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {walkoverOpen && (
        <WalkoverOverlay
          sideName={sideLabel}
          onWalkover={walkover}
          onClose={() => setWalkoverOpen(false)}
        />
      )}
    </LiveShell>
  )
}
