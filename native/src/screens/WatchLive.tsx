import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useKeepAwake } from 'expo-keep-awake'
import { useMemo, useState } from 'react'
import { LiveRecapOverlay } from '../components/LiveRecapOverlay'
import { LiveStatsOverlay } from '../components/LiveStatsOverlay'
import { MatchClock } from '../components/MatchClock'
import { PressureCallout } from '../components/PressureCallout'
import { ServeReceiveStrip } from '../components/ServeReceiveStrip'
import { TvScoreboard } from '../components/TvScoreboard'
import { getServeInfo, playersOnSide, type Side } from '../engine'
import { getPressureSituation } from '../engine/pressure'
import { useWatchClient } from '../hooks/useWatchClient'
import { useT } from '../i18n/useT'
import { useLayout } from '../layout/useLayout'
import type { RootStackParamList } from '../navigation/types'
import { AppButton, BodyText, Row, Screen, Stack } from '../styles/ui'
import styled from 'styled-components/native'

type Props = NativeStackScreenProps<RootStackParamList, 'WatchLive'>

const Banner = styled.Text<{ $warn?: boolean }>`
  text-align: center;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${(p) => (p.$warn ? p.theme.warning : p.theme.textMuted)};
  font-family: ${(p) => p.theme.fontUiBold};
`

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

const MoreSlot = styled.View`
  flex-grow: 1;
  flex-basis: 46%;
  min-width: 140px;
`

export function WatchLive({ navigation, route }: Props) {
  const t = useT()
  const layout = useLayout()
  useKeepAwake()
  const { snapshot, status } = useWatchClient(route.params.url)
  const [statsOpen, setStatsOpen] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [bigScreen, setBigScreen] = useState(false)
  const nameOf = useMemo(() => {
    const names = snapshot?.playerNames ?? {}
    return (id: string) => names[id] ?? id
  }, [snapshot])

  if (!snapshot) {
    return (
      <Screen>
        <AppButton variant="ghost" onPress={() => navigation.goBack()}>
          {t('watch.back')}
        </AppButton>
        <BodyText style={{ marginTop: 16 }}>
          {status === 'lost' ? t('watch.failed') : t('watch.connecting')}
        </BodyText>
      </Screen>
    )
  }

  const { state } = snapshot
  const serve = getServeInfo(state)
  const pressure = getPressureSituation(state)
  const sideName = (side: Side) => playersOnSide(state.config, side).map(nameOf).join(' / ')
  const overlay =
    state.pausedAt
      ? t('watch.hostPaused')
      : state.pendingOverlay === 'warmup'
        ? t('live.warmup')
        : state.pendingOverlay === 'changeover'
          ? t('live.changeover')
          : state.pendingOverlay === 'ball_change'
            ? t('live.ballChange')
            : state.pendingOverlay === 'set_break'
              ? t('live.setBreak')
              : state.isComplete
                ? t('watch.final')
                : null

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
        <AppButton variant="ghost" onPress={() => navigation.navigate('WatchMatch')}>
          {t('watch.back')}
        </AppButton>
        <MatchClock state={state} />
      </Row>
      <Banner $warn={status === 'lost'} testID="watch-banner">
        {status === 'lost' ? t('watch.disconnected') : t('watch.viewOnly')}
        {' · '}
        {state.isComplete ? t('watch.final') : t('watch.live')}
      </Banner>
      <ServeReceiveStrip serve={serve} nameOf={nameOf} secondServe={state.isSecondServe} />
      {pressure ? <PressureCallout situation={pressure} /> : null}
      <NextLine>
        {t('live.next')}{' '}
        <NextStrong $kind="serve">{nameOf(serve.serverId)}</NextStrong> {t('live.servesTo')}{' '}
        <NextStrong $kind="receive">{nameOf(serve.receiverId)}</NextStrong>
        {overlay ? ` · ${overlay}` : ''}
      </NextLine>
      <TvScoreboard
        state={state}
        serve={serve}
        nameOf={nameOf}
        theme={snapshot.theme}
        size={bigScreen || layout.isLandscape ? 'big' : 'normal'}
      />
      <Stack $gap={8} style={{ marginTop: 20 }}>
        <AppButton variant="ghost" onPress={() => setMoreOpen((open) => !open)} testID="watch-more">
          {moreOpen ? t('live.less') : t('live.more')}
        </AppButton>
        {moreOpen ? (
          <Row $wrap $gap={8}>
            <MoreSlot>
              <AppButton
                variant="ghost"
                testID="watch-open-stats"
                onPress={() => {
                  setStatsOpen(true)
                  setMoreOpen(false)
                }}
              >
                {t('live.stats')}
              </AppButton>
            </MoreSlot>
            <MoreSlot>
              <AppButton
                variant="ghost"
                testID="watch-open-recap"
                onPress={() => {
                  setRecapOpen(true)
                  setMoreOpen(false)
                }}
              >
                {t('live.recap')}
              </AppButton>
            </MoreSlot>
            <MoreSlot>
              <AppButton
                variant={bigScreen ? 'accent' : 'ghost'}
                testID="watch-toggle-big"
                onPress={() => {
                  setBigScreen((open) => !open)
                  setMoreOpen(false)
                }}
              >
                {bigScreen ? t('live.exitBigScreen') : t('live.bigScreen')}
              </AppButton>
            </MoreSlot>
          </Row>
        ) : null}
      </Stack>
      {statsOpen ? (
        <LiveStatsOverlay state={state} nameOf={nameOf} onClose={() => setStatsOpen(false)} />
      ) : null}
      {recapOpen ? (
        <LiveRecapOverlay
          state={state}
          nameOf={nameOf}
          sideName={sideName}
          onClose={() => setRecapOpen(false)}
        />
      ) : null}
    </Screen>
  )
}
