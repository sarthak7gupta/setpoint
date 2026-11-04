import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useKeepAwake } from 'expo-keep-awake'
import * as ScreenOrientation from 'expo-screen-orientation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, ScrollView } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { BreakOverlay } from '../components/BreakOverlay'
import { LiveRecapOverlay } from '../components/LiveRecapOverlay'
import { LiveStatsOverlay } from '../components/LiveStatsOverlay'
import { MatchClock } from '../components/MatchClock'
import { MatchLiveSettingsOverlay } from '../components/MatchLiveSettings'
import { WalkoverOverlay } from '../components/WalkoverOverlay'
import { PauseOverlay } from '../components/PauseOverlay'
import { PressureCallout } from '../components/PressureCallout'
import { ServeReceiveStrip } from '../components/ServeReceiveStrip'
import { TvScoreboard } from '../components/TvScoreboard'
import { PauseIcon, SpeakerIcon } from '../components/controlIcons'
import { VoiceListenButton } from '../components/VoiceListenButton'
import { useApp } from '../context/AppContext'
import { type PointOutcome, playersOnSide, type MatchState, type Side, warmupManualOverlayEnabled } from '../engine'
import { getPressureSituation } from '../engine/pressure'
import { hapticImpact, hapticSuccess, hapticWarning } from '../haptics'
import { useMatchController } from '../hooks/useMatchController'
import { useVoiceScoring } from '../hooks/useVoiceScoring'
import { useWatchHost } from '../hooks/useWatchHost'
import { useWristCompanion } from '../hooks/useWristCompanion'
import { WATCH_PORT } from '../watch'
import { useT } from '../i18n/useT'
import { useLayout } from '../layout/useLayout'
import type { RootStackParamList } from '../navigation/types'
import { AppButton, BodyText, Card, FeedbackPressable, Row, Screen, Stack } from '../styles/ui'
import { buildLiveCallout, serveCalloutText } from '../utils/gameCallout'
import { useBetweenPointTimer } from '../utils/betweenPointTimer'
import { speakScore, stopScoreSpeech } from '../utils/speakScore'
import {
  describeVoiceCommand,
  dispatchVoiceCommand,
  parseVoiceCommand,
  voicePlayersFromState,
} from '../utils/voiceCommand'
import styled, { css, useTheme } from 'styled-components/native'

type Props = NativeStackScreenProps<RootStackParamList, 'LiveMatch'>

const NextLine = styled.Text`
  text-align: center;
  color: ${(p) => p.theme.textMuted};
  font-size: 14px;
  margin-bottom: 14px;
  font-family: ${(p) => p.theme.fontUi};
`

const NextStrong = styled.Text<{ $kind: 'serve' | 'receive' }>`
  color: ${(p) => (p.$kind === 'serve' ? p.theme.serve : p.theme.receive)};
  font-family: ${(p) => p.theme.fontUiSemiBold};
`

const BetweenPointSec = styled.Text`
  color: ${(p) => p.theme.textMuted};
  opacity: 0.72;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.4px;
`

const LoadingText = styled.Text`
  color: ${(p) => p.theme.text};
  font-family: ${(p) => p.theme.fontUi};
  font-size: 16px;
`

const FlexBtn = styled.View`
  flex: 1;
`

const OutcomeBtn = styled.View`
  flex-grow: 1;
  flex-basis: 30%;
  min-width: 72px;
`

const MoreSlot = styled.View`
  flex-grow: 1;
  flex-basis: 46%;
  min-width: 140px;
`

const Split = styled.View`
  flex: 1;
  flex-direction: row;
  gap: 20px;
  align-items: stretch;
  min-height: 0;
`

const SplitPane = styled.View`
  flex: 1;
  min-width: 0;
  min-height: 0;
`

const HeaderChip = styled(FeedbackPressable)<{ $icon?: boolean; $disabled?: boolean; $muted?: boolean }>`
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border-width: 1px;
  border-color: ${(p) => p.theme.line};
  opacity: ${(p) => (p.$disabled ? 0.45 : p.$muted ? 0.72 : 1)};
  ${(p) =>
    p.$icon
      ? css`
          width: 44px;
          height: 44px;
          padding: 0px;
        `
      : css`
          padding: 6px 12px;
        `}
`

const VoiceStatus = styled.Text`
  text-align: center;
  color: ${(p) => p.theme.textMuted};
  font-size: 13px;
  margin-bottom: 12px;
  font-family: ${(p) => p.theme.fontUi};
`

const OverlayMic = styled.View`
  margin-top: 14px;
  align-items: center;
`

export function LiveMatch({ navigation, route }: Props) {
  const { matchId } = route.params
  const t = useT()
  const layout = useLayout()
  const { theme, settings, locale, updateSettings } = useApp()
  const palette = useTheme()
  useKeepAwake()
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
    flushPersist, loadStatus, saveStatus, retrySave, retryLoad,
  } = useMatchController(matchId)
  const isFocused = useIsFocused()
  const [outcome, setOutcome] = useState<PointOutcome>('other')
  const [pickPlayerFor, setPickPlayerFor] = useState<Side | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [walkoverOpen, setWalkoverOpen] = useState(false)
  const [bigScreen, setBigScreen] = useState(false)
  const [sharing, setSharing] = useState(true)
  const watchHost = useWatchHost({
    enabled: sharing,
    matchId,
    playerNames: record?.playerNames,
    state,
    theme,
  })
  const [heard, setHeard] = useState<{ transcript: string; label: string; applied: boolean } | null>(
    null,
  )
  const leavingForSummary = useRef(false)
  const prevStateRef = useRef<MatchState | null>(null)
  const speakWaitRef = useRef(Promise.resolve())
  const servedAfterTimeRef = useRef(false)
  const hapticsOn = settings.hapticsEnabled
  const landscapeSplit = bigScreen || (layout.isLandscape && layout.width >= 700)
  const boardSize = bigScreen || landscapeSplit ? 'big' : 'normal'
  const tapHeight = bigScreen
    ? Math.max(layout.pointButtonMinHeight, 56)
    : layout.pointButtonMinHeight

  useEffect(() => {
    let cancelled = false
    const apply = async (lockLandscape: boolean) => {
      navigation.setOptions({ orientation: lockLandscape ? 'landscape' : 'default' })
      try {
        if (lockLandscape) {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
        } else {
          await ScreenOrientation.unlockAsync()
        }
      } catch {
        // Expo Go / simulators may ignore lock; layout still follows big-screen UI.
      }
    }
    void apply(bigScreen).then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [bigScreen, navigation])

  useEffect(() => {
    const unlock = () => {
      setBigScreen(false)
      navigation.setOptions({ orientation: 'default' })
      void ScreenOrientation.unlockAsync().catch(() => {})
    }
    const blur = navigation.addListener('blur', unlock)
    const beforeRemove = navigation.addListener('beforeRemove', unlock)
    return () => {
      blur()
      beforeRemove()
      unlock()
    }
  }, [navigation])

  useEffect(() => {
    if (!isFocused) {
      markAway()
      return
    }
    clearAway()
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') clearAway()
      else markAway()
    })
    return () => {
      sub.remove()
      markAway()
    }
  }, [isFocused, markAway, clearAway])

  const goHome = useCallback(() => {
    setBigScreen(false)
    markAway()
    navigation.setOptions({ orientation: 'default' })
    void ScreenOrientation.unlockAsync().catch(() => {})
    void flushPersist().then(() => {
      navigation.navigate('Home')
    }).catch(() => {})
  }, [navigation, flushPersist, markAway])

  const nameOf = useMemo(() => {
    const map = record?.playerNames ?? {}
    return (id: string) => map[id] ?? id.slice(0, 6)
  }, [record])

  const pressure = useMemo(() => (state ? getPressureSituation(state) : null), [state])

  const betweenPointSec = useBetweenPointTimer({
    eventCount: state?.events.length,
    active: Boolean(state && !state.isComplete && !state.pausedAt),
  })

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
    const matchIdToOpen = record.id
    void hapticSuccess(hapticsOn)
    setBigScreen(false)
    navigation.setOptions({ orientation: 'default' })
    void ScreenOrientation.unlockAsync().catch(() => {})
    void flushPersist()
      .then(() => speakWaitRef.current)
      .then(() => {
        navigation.replace('MatchSummary', { matchId: matchIdToOpen })
      })
      .catch(() => { leavingForSummary.current = false })
  }, [state?.isComplete, saveStatus, record, navigation, flushPersist, hapticsOn])

  const playerNames = useMemo(() => (record ? Object.values(record.playerNames) : []), [record])

  const scoringActions = useMemo(
    () => ({
      point: (input: Parameters<typeof point>[0]) => {
        point(input)
        void hapticImpact(hapticsOn, 'medium')
        setPickPlayerFor(null)
        setOutcome('other')
      },
      fault: () => {
        void hapticWarning(hapticsOn)
        fault()
      },
      undo,
      pause,
      resume,
      skip: skipOverlay,
    }),
    [point, fault, undo, pause, resume, skipOverlay, hapticsOn],
  )

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
        actions: scoringActions,
      })
      setHeard({
        transcript,
        label: describeVoiceCommand({ command, nameOf }),
        applied,
      })
    },
    [state, serve, nameOf, canUndo, scoringActions],
  )

  const voice = useVoiceScoring({
    enabled: Boolean(settings.voiceCommandsEnabled && state && !state.isComplete),
    locale,
    playerNames,
    onFinal: onVoiceFinal,
    stopSpeech: stopScoreSpeech,
  })

  const wrist = useWristCompanion({
    enabled: Boolean(isFocused && state && !state.isComplete),
    matchId,
    state,
    nameOf,
    canUndo,
    actions: scoringActions,
  })

  const mic = settings.voiceCommandsEnabled ? (
    <VoiceListenButton
      listening={voice.listening}
      supported={voice.supported}
      disabled={!state || state.isComplete}
      onToggle={voice.toggle}
      label={voice.listening ? t('live.listening') : t('live.mic')}
      accessibilityHint={
        voice.supported ? t('live.voiceHint') : t('live.voiceNeedBuild')
      }
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

  if (!state || !record || !serve) {
    return (
      <Screen>
        <LoadingText>{t(loadStatus === 'error' ? 'common.loadFailed' : loadStatus === 'missing' ? 'common.missingMatch' : 'common.loading')}</LoadingText>
        {loadStatus !== 'loading' && <AppButton onPress={retryLoad}>{t('common.retry')}</AppButton>}
        <AppButton onPress={() => navigation.navigate('Home')}>{t('common.home')}</AppButton>
      </Screen>
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
    void hapticImpact(hapticsOn, 'medium')
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
      !settings.quietScoring && (outcome === 'winner' || outcome === 'unforced_error')
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
    state.pendingOverlay === 'none' &&
    !state.isComplete &&
    warmupManualOverlayEnabled(state.config)
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

  const scoreboard = (
    <>
      <ServeReceiveStrip
        serve={serve}
        nameOf={nameOf}
        pulse={servePulse}
        secondServe={state.isSecondServe}
      />

      {pressure && <PressureCallout situation={pressure} />}

      <NextLine>
        {t('live.next')} <NextStrong $kind="serve">{serverName}</NextStrong> {t('live.servesTo')}{' '}
        <NextStrong $kind="receive">{receiverName}</NextStrong>
        {state.sets[state.sets.length - 1].isTiebreak ? ` · ${t('live.tiebreak')}` : ''}
        {betweenPointSec != null ? (
          <BetweenPointSec testID="between-point-timer"> {betweenPointSec}</BetweenPointSec>
        ) : null}
      </NextLine>

      {(voice.listening ||
        heard ||
        voice.error ||
        (settings.voiceCommandsEnabled && !voice.supported)) && (
        <VoiceStatus testID="voice-status">
          {!voice.supported
            ? t('live.voiceNeedBuild')
            : voice.listening
              ? voice.interim || t('live.voiceHint')
              : voice.error === 'not-allowed'
                ? t('live.voiceUnavailable')
                : voice.error === 'start-failed' || voice.error === 'service-not-allowed'
                  ? t('live.voiceNeedBuild')
                  : heard
                    ? heard.applied
                      ? heard.label
                      : `${heard.label} · “${heard.transcript}”`
                    : ''}
        </VoiceStatus>
      )}

      <TvScoreboard
        state={state}
        serve={serve}
        nameOf={nameOf}
        theme={theme}
        size={boardSize}
      />
    </>
  )

  const controls = (
    <>
      <Stack $gap={10} style={{ marginTop: landscapeSplit ? 0 : 16 }}>
        <BodyText accessibilityLiveRegion="polite">{t(saveStatus === 'error' ? 'common.saveFailed' : saveStatus === 'saving' ? 'common.saving' : 'common.saved')}</BodyText>
        {saveStatus === 'error' && <AppButton onPress={retrySave}>{t('common.retry')}</AppButton>}
        <AppButton variant="ghost" accessibilityState={{ selected: settings.quietScoring }} onPress={() => { setOutcome('other'); setPickPlayerFor(null); void updateSettings({ quietScoring: !settings.quietScoring }) }}>
          {t(settings.quietScoring ? 'live.detailed' : 'live.quiet')}
        </AppButton>
        <Row $wrap $gap={6}>
          {!settings.quietScoring && outcomes.map((o) => (
            <OutcomeBtn key={o.id}>
              <AppButton
                accessibilityState={{ selected: outcome === o.id }}
                variant={outcome === o.id ? 'accent' : 'ghost'}
                onPress={() => onOutcomeTap(o.id)}
                disabled={state.pendingOverlay !== 'none' || Boolean(state.pausedAt)}
              >
                {o.label}
              </AppButton>
            </OutcomeBtn>
          ))}
        </Row>

        <Row $gap={8}>
          <FlexBtn>
            <AppButton
              variant="primary"
              onPress={() => onSideTap('a')}
              testID="point-a"
              disabled={state.pendingOverlay !== 'none' || Boolean(state.pausedAt)}
              minHeight={tapHeight}
            >
              {t('live.pointTo', { name: sideLabel('a') })}
            </AppButton>
          </FlexBtn>
          <FlexBtn>
            <AppButton
              variant="primary"
              onPress={() => onSideTap('b')}
              testID="point-b"
              disabled={state.pendingOverlay !== 'none' || Boolean(state.pausedAt)}
              minHeight={tapHeight}
            >
              {t('live.pointTo', { name: sideLabel('b') })}
            </AppButton>
          </FlexBtn>
        </Row>

        <AppButton
          variant={state.isSecondServe ? 'danger' : 'warning'}
          onPress={() => {
            void hapticWarning(hapticsOn)
            fault()
          }}
          testID="fault-btn"
          disabled={state.pendingOverlay !== 'none' || Boolean(state.pausedAt)}
          minHeight={tapHeight}
        >
          {state.isSecondServe ? t('live.doubleFault') : t('live.fault')}
        </AppButton>
      </Stack>

      {pickPlayerFor && (
        <Card style={{ marginTop: 16 }}>
          <BodyText style={{ marginBottom: 10 }}>{t('live.assign')}</BodyText>
          <Row $wrap $gap={8}>
            <AppButton variant="accent" onPress={() => award(pickPlayerFor)}>
              {t('live.teamOnly')}
            </AppButton>
            {playersOnSide(state.config, pickPlayerFor).map((id) => (
              <AppButton key={id} onPress={() => award(pickPlayerFor, id)}>
                {nameOf(id)}
              </AppButton>
            ))}
            <AppButton variant="ghost" onPress={() => setPickPlayerFor(null)}>
              {t('common.cancel')}
            </AppButton>
          </Row>
        </Card>
      )}

      <Stack $gap={8} style={{ marginTop: 20 }}>
        <AppButton
          variant="ghost"
          onPress={() => setMoreOpen((open) => !open)}
          testID="more-actions"
        >
          {moreOpen ? t('live.less') : t('live.more')}
        </AppButton>
        {moreOpen && (
          <Row $wrap $gap={8}>
            <MoreSlot>
              <AppButton
                variant="ghost"
                onPress={() => {
                  setStatsOpen(true)
                  setMoreOpen(false)
                }}
                testID="open-live-stats"
              >
                {t('live.stats')}
              </AppButton>
            </MoreSlot>
            <MoreSlot>
              <AppButton
                variant="ghost"
                onPress={() => {
                  setRecapOpen(true)
                  setMoreOpen(false)
                }}
                testID="open-live-recap"
              >
                {t('live.recap')}
              </AppButton>
            </MoreSlot>
            <MoreSlot>
              <AppButton
                variant={bigScreen ? 'accent' : 'ghost'}
                onPress={() => {
                  setBigScreen((open) => !open)
                  setMoreOpen(false)
                }}
                testID="toggle-big-screen"
              >
                {bigScreen ? t('live.exitBigScreen') : t('live.bigScreen')}
              </AppButton>
            </MoreSlot>
            <MoreSlot>
              <AppButton
                variant="ghost"
                onPress={() => {
                  setSettingsOpen(true)
                  setMoreOpen(false)
                }}
                testID="open-live-settings"
              >
                {t('live.matchSettings')}
              </AppButton>
            </MoreSlot>
            <MoreSlot>
              <AppButton
                variant="ghost"
                onPress={() => {
                  setWalkoverOpen(true)
                  setMoreOpen(false)
                }}
                testID="open-walkover"
              >
                {t('live.walkover')}
              </AppButton>
            </MoreSlot>
            <MoreSlot>
              <AppButton
                variant="ghost"
                disabled={!canStartWarmup}
                onPress={() => {
                  beginWarmup()
                  setMoreOpen(false)
                }}
                testID="start-warmup"
              >
                {t('live.startWarmup')}
              </AppButton>
            </MoreSlot>
            <MoreSlot>
              <AppButton
                variant={sharing && watchHost.listenOk ? 'accent' : 'ghost'}
                onPress={() => setSharing((on) => !on)}
                testID="toggle-watch-share"
              >
                {sharing ? t('watch.sharingOn') : t('watch.sharingOff')}
              </AppButton>
            </MoreSlot>
          </Row>
        )}
        {moreOpen ? (
          <BodyText style={{ marginTop: 8, opacity: 0.85 }}>
            {!watchHost.available
              ? t('watch.needBuild')
              : !sharing
                ? t('watch.sharingOffHint')
                : watchHost.address
                  ? `${t('watch.shareHint')} ${t('watch.shareAddress', { address: `${watchHost.address}:${WATCH_PORT}` })}`
                  : t('watch.shareHint')}
            {'\n'}
            {!wrist.available
              ? t('wrist.needBuild')
              : wrist.reachable
                ? t('wrist.connected')
                : wrist.paired
                  ? t('wrist.paired')
                  : t('wrist.unpaired')}
          </BodyText>
        ) : null}
      </Stack>
    </>
  )

  return (
    <Screen scroll={!landscapeSplit}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
        <AppButton variant="ghost" onPress={goHome}>
          {t('live.home')}
        </AppButton>
        <Row $gap={8} style={{ alignItems: 'center' }}>
          <MatchClock state={state} fallbackStart={record.createdAt} />
          {!state.isComplete && (
            <HeaderChip
              $icon
              onPress={pause}
              disabled={Boolean(state.pausedAt)}
              $disabled={Boolean(state.pausedAt)}
              testID="pause-match"
              accessibilityRole="button"
              accessibilityLabel={t('overlay.pause')}
              hitSlop={8}
            >
              <PauseIcon />
            </HeaderChip>
          )}
          <HeaderChip
            $icon
            $muted={!settings.voiceCalloutsEnabled}
            onPress={() => {
              const next = !settings.voiceCalloutsEnabled
              if (!next) void stopScoreSpeech()
              void updateSettings({ voiceCalloutsEnabled: next })
            }}
            testID="mute-callouts"
            accessibilityRole="button"
            accessibilityState={{ selected: !settings.voiceCalloutsEnabled }}
            accessibilityLabel={
              settings.voiceCalloutsEnabled ? t('live.muteCallouts') : t('live.unmuteCallouts')
            }
            hitSlop={8}
          >
            <SpeakerIcon
              color={settings.voiceCalloutsEnabled ? palette.text : palette.textMuted}
              muted={!settings.voiceCalloutsEnabled}
            />
          </HeaderChip>
          {mic}
        </Row>
        <AppButton variant="ghost" onPress={undo} disabled={!canUndo || Boolean(state.pausedAt)}>
          {t('live.undo')}
        </AppButton>
      </Row>

      {landscapeSplit ? (
        <Split>
          <SplitPane>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              alwaysBounceVertical={false}
              overScrollMode="never"
            >
              {scoreboard}
            </ScrollView>
          </SplitPane>
          <SplitPane>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 28 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              testID="landscape-controls-scroll"
              bounces={false}
              alwaysBounceVertical={false}
              overScrollMode="never"
            >
              {controls}
            </ScrollView>
          </SplitPane>
        </Split>
      ) : (
        <>
          {scoreboard}
          {controls}
        </>
      )}

      {state.pausedAt && (
        <PauseOverlay
          state={state}
          nameOf={nameOf}
          fallbackStart={record.createdAt}
          onResume={resume}
          voiceToggle={mic ? <OverlayMic>{mic}</OverlayMic> : undefined}
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
    </Screen>
  )
}
