import { Dialog } from './Dialog'
import { LinearGradient } from 'expo-linear-gradient'
import type { ReactNode } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import styled, { useTheme } from 'styled-components/native'
import { formatGameScore, formatSetScore, playersOnSide, type MatchState, type Side } from '../engine'
import { useT } from '../i18n/useT'
import { MatchClock } from './MatchClock'
import { AppButton, Brand, DisplayScore, Muted } from '../styles/ui'

const Wrap = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 28px 24px;
`

const Vs = styled.Text`
  color: ${(p) => p.theme.textMuted};
  font-size: 16px;
  margin: 8px 0 12px;
  font-family: ${(p) => p.theme.fontUi};
  text-transform: uppercase;
  letter-spacing: 2px;
`

const SideName = styled.Text`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 42px;
  line-height: 46px;
  color: ${(p) => p.theme.text};
  text-align: center;
`

const ScoreBlock = styled.View`
  align-items: center;
  margin-top: 28px;
  margin-bottom: 12px;
  gap: 8px;
`

const ClockWrap = styled.View`
  margin-top: 18px;
  margin-bottom: 36px;
`

interface Props {
  state: MatchState
  nameOf: (id: string) => string
  fallbackStart?: number
  onResume: () => void
  voiceToggle?: ReactNode
  onStats?: () => void
}

export function PauseOverlay({ state, nameOf, fallbackStart, onResume, voiceToggle, onStats }: Props) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const sideLabel = (side: Side) => playersOnSide(state.config, side).map(nameOf).join(' / ')
  const points = formatGameScore(state)
  const setLine = state.sets
    .filter((s) => s.completed || s.gamesA + s.gamesB > 0 || s.isTiebreak)
    .map((s) => formatSetScore(s))
    .join('   ')

  return (
    <Dialog
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={onResume}
    >
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Wrap>
          <Brand>SetPoint</Brand>
          <Muted style={{ marginTop: 8, marginBottom: 28 }}>{t('live.paused')}</Muted>
          <SideName>{sideLabel('a')}</SideName>
          <Vs>{t('live.versus')}</Vs>
          <SideName>{sideLabel('b')}</SideName>
          <ScoreBlock>
            {setLine ? <DisplayScore>{setLine}</DisplayScore> : <DisplayScore>0-0</DisplayScore>}
            <DisplayScore>
              {points.pointsA} – {points.pointsB}
            </DisplayScore>
          </ScoreBlock>
          <ClockWrap>
            <MatchClock state={state} fallbackStart={fallbackStart} />
          </ClockWrap>
          <AppButton variant="accent" onPress={onResume} minHeight={56} testID="resume-match">
            {t('overlay.resume')}
          </AppButton>
          {onStats && (
            <AppButton variant="ghost" onPress={onStats} testID="overlay-stats" style={{ marginTop: 12 }}>
              {t('live.stats')}
            </AppButton>
          )}
          {voiceToggle}
        </Wrap>
      </LinearGradient>
    </Dialog>
  )
}
