import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { GuidedTour } from '../components/GuidedTour'
import { useApp } from '../context/AppContext'
import { listMatches, type MatchRecord } from '../db'
import { useT } from '../i18n/useT'
import { useLayout } from '../layout/useLayout'
import type { RootStackParamList } from '../navigation/types'
import {
  AppButton,
  Brand,
  MatchStatus,
  Muted,
  Row,
  Screen,
  Stack,
  Sub,
  Title,
  TwoPane,
} from '../styles/ui'
import styled from 'styled-components/native'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

const RecentLabel = styled.Text`
  font-weight: 600;
  font-size: 16px;
  color: ${(p) => p.theme.text};
  font-family: ${(p) => p.theme.fontUiSemiBold};
`

const ButtonColumn = styled.View`
  align-self: stretch;
  gap: 7px;
`

function matchNames(m: MatchRecord): string {
  const names = m.config.playerIds.map((id) => m.playerNames[id] ?? id)
  return m.config.format === 'singles'
    ? `${names[0]} vs ${names[1]}`
    : `${names[0]}/${names[1]} vs ${names[2]}/${names[3]}`
}

export function Home({ navigation }: Props) {
  const t = useT()
  const layout = useLayout()
  const { ready, settings, updateSettings } = useApp()
  const [recent, setRecent] = useState<MatchRecord[]>([])
  const showTour = ready && !settings.hasCompletedTour

  useFocusEffect(
    useCallback(() => {
      void listMatches().then((m) => setRecent(m.slice(0, 5)))
    }, []),
  )

  const completeTour = () => {
    void updateSettings({ hasCompletedTour: true })
  }

  const hero = (
    <>
      <Brand style={{ fontSize: layout.brandSize, lineHeight: layout.brandSize }}>SetPoint</Brand>
      <Sub>{t('home.tagline')}</Sub>
      <Stack $gap={10}>
        <AppButton variant="primary" onPress={() => navigation.navigate('NewMatch')}>
          {t('home.newMatch')}
        </AppButton>
        <AppButton variant="ghost" onPress={() => navigation.navigate('WatchMatch')}>
          {t('home.watch')}
        </AppButton>
        <AppButton variant="ghost" onPress={() => navigation.navigate('History')}>
          {t('home.history')}
        </AppButton>
        <AppButton variant="ghost" onPress={() => navigation.navigate('Profiles')}>
          {t('home.profiles')}
        </AppButton>
        <AppButton variant="ghost" onPress={() => navigation.navigate('Settings')}>
          {t('home.settings')}
        </AppButton>
      </Stack>
    </>
  )

  const recentList =
    recent.length > 0 ? (
      <Stack $gap={12} style={{ marginTop: layout.twoPane ? 0 : 32 }}>
        <Title style={{ fontSize: layout.twoPane ? 32 : 26 }}>{t('home.recent')}</Title>
        {recent.map((m) => (
          <AppButton
            key={m.id}
            variant="ghost"
            onPress={() =>
              navigation.navigate(m.state.isComplete ? 'MatchSummary' : 'LiveMatch', {
                matchId: m.id,
              })
            }
          >
            <ButtonColumn>
              <RecentLabel>{matchNames(m)}</RecentLabel>
              <Row $gap={8} $wrap>
                <Muted>{m.metadata.date}</Muted>
                <MatchStatus $complete={m.state.isComplete}>
                  {m.state.isComplete ? t('home.final') : t('home.inProgress')}
                </MatchStatus>
              </Row>
            </ButtonColumn>
          </AppButton>
        ))}
      </Stack>
    ) : null

  return (
    <Screen>
      {recentList && layout.twoPane ? <TwoPane a={hero} b={recentList} /> : (
        <>
          {hero}
          {recentList}
        </>
      )}
      {showTour && <GuidedTour onComplete={completeTour} />}
    </Screen>
  )
}
