import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState } from 'react'
import { useT } from '../i18n/useT'
import type { RootStackParamList } from '../navigation/types'
import {
  AppButton,
  Field,
  Input,
  MatchStatus,
  Screen,
  ScreenTopBar,
  Stack,
  Sub,
  Title,
} from '../styles/ui'
import { resolveWatchInput, scanWatchNetwork, WATCH_SCAN_PORTS, type WatchFound } from '../watch'
import { nativeSubnetBases } from '../watch/localIp'
import styled from 'styled-components/native'

type Props = NativeStackScreenProps<RootStackParamList, 'WatchMatch'>

const FoundLabel = styled.Text`
  font-weight: 600;
  font-size: 16px;
  color: ${(p) => p.theme.text};
  font-family: ${(p) => p.theme.fontUiSemiBold};
`

const Hint = styled.Text`
  color: ${(p) => p.theme.textMuted};
  font-size: 15px;
  line-height: 22px;
  font-family: ${(p) => p.theme.fontUi};
`

const ButtonColumn = styled.View`
  align-self: stretch;
  gap: 6px;
`

export function WatchMatch({ navigation }: Props) {
  const t = useT()
  const [scanning, setScanning] = useState(false)
  const [found, setFound] = useState<WatchFound[]>([])
  const [scanned, setScanned] = useState(false)
  const [manual, setManual] = useState('')
  const [error, setError] = useState<string | null>(null)

  const scan = async () => {
    setScanning(true)
    setError(null)
    setFound([])
    try {
      const { ip, bases } = await nativeSubnetBases()
      if (bases.length === 0) {
        setScanned(true)
        setError(t('watch.noWifi'))
        return
      }
      const hits = await scanWatchNetwork({
        bases,
        ports: WATCH_SCAN_PORTS,
        skipHost: ip ?? undefined,
        fetchFn: fetch,
        onFound: (hit) =>
          setFound((current) => {
            if (current.some((row) => row.snapshot.matchId === hit.snapshot.matchId)) return current
            return [...current, hit].sort((a, b) => a.snapshot.label.localeCompare(b.snapshot.label))
          }),
      })
      setFound(hits)
      setScanned(true)
    } finally {
      setScanning(false)
    }
  }

  const connectManual = async () => {
    const urls = resolveWatchInput(manual)
    if (urls.length === 0) {
      setError(t('watch.badAddress'))
      return
    }
    setError(null)
    for (const url of urls) {
      try {
        const res = await fetch(url)
        if (res.ok) {
          navigation.navigate('WatchLive', { url })
          return
        }
      } catch {
        /* try next port */
      }
    }
    setError(t('watch.failed'))
  }

  return (
    <Screen>
      <ScreenTopBar label={t('common.home')} onPress={() => navigation.navigate('Home')} />
      <Title>{t('watch.title')}</Title>
      <Sub>{t('watch.sub')}</Sub>
      <Stack $gap={10}>
        <AppButton
          variant="primary"
          onPress={() => void scan()}
          disabled={scanning}
          testID="watch-scan"
        >
          {scanning ? t('watch.scanning') : t('watch.scan')}
        </AppButton>
        {found.map((hit) => (
          <AppButton
            key={hit.snapshot.matchId}
            variant="ghost"
            testID="watch-found"
            onPress={() => navigation.navigate('WatchLive', { url: hit.url })}
          >
            <ButtonColumn>
              <FoundLabel>{hit.snapshot.label}</FoundLabel>
              <MatchStatus $complete={hit.snapshot.state.isComplete}>
                {hit.snapshot.state.isComplete ? t('watch.final') : t('watch.live')}
              </MatchStatus>
            </ButtonColumn>
          </AppButton>
        ))}
        {scanned && !scanning && found.length === 0 && !error ? (
          <Hint>{t('watch.empty')}</Hint>
        ) : null}
        {error ? <Hint>{error}</Hint> : null}
        <Field label={t('watch.manual')}>
          <Input
            value={manual}
            onChangeText={setManual}
            placeholder={t('watch.addressPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            testID="watch-address"
          />
        </Field>
        <AppButton variant="ghost" onPress={() => void connectManual()} testID="watch-connect">
          {t('watch.connect')}
        </AppButton>
      </Stack>
    </Screen>
  )
}
