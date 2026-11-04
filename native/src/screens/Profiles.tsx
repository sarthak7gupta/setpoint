import { Dialog } from '../components/Dialog'
import { playerIdentityIds } from '../../../shared/utils/players'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useCallback, useMemo, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { listMatches, listPlayers, mergePlayers, type MatchRecord, type PlayerRecord } from '../db'
import { sideOfPlayer } from '../engine'
import { useT } from '../i18n/useT'
import { useLayout } from '../layout/useLayout'
import type { RootStackParamList } from '../navigation/types'
import { addPointSlices, computePlayerSlice, computePlayerStats, displayPointSlice, emptyPointSlice, type StatSituation } from '../stats/compute'
import { playerIdInMatch } from '../stats/form'
import { SliceStatGrid } from '../components/SliceStatGrid'
import { StatSituationBar } from '../components/StatSituationBar'
import {
  AppButton,
  SelectField,
  OverlayBackdrop, OverlayCard, OverlayTitle, OverlaySub,
  Heading,
  Muted,
  Screen,
  ScreenTopBar,
  Stack,
  StatCard,
  StatGrid,
  StatSmall,
  StatStrong,
  Sub,
  Title,
  TwoPane,
} from '../styles/ui'
import styled from 'styled-components/native'

type Props = NativeStackScreenProps<RootStackParamList, 'Profiles'>

const PlayerHeading = styled.Text`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 28px;
  color: ${(p) => p.theme.text};
`

const LogSub = styled.Text`
  font-size: 13px;
  color: ${(p) => p.theme.textMuted};
  font-family: ${(p) => p.theme.fontUi};
  margin-top: 4px;
`

const LogWrap = styled.View`
  align-self: stretch;
`

export function Profiles({ navigation }: Props) {
  const t = useT()
  const { twoPane } = useLayout()
  const [players, setPlayers] = useState<PlayerRecord[]>([])
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [situation, setSituation] = useState<StatSituation>('all')
  const [status, setStatus] = useState<'loading'|'ready'|'error'>('loading')
  const [mergeFrom, setMergeFrom] = useState('')
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState(false)
  const [confirmMerge, setConfirmMerge] = useState(false)
  const reload = useCallback(() => {
    setStatus('loading')
    void Promise.all([listPlayers(), listMatches()]).then(([p,m]) => { setPlayers(p); setMatches(m); setStatus('ready') }, () => setStatus('error'))
  }, [])
  const merge = async () => {
    if (!selected || !mergeFrom) return
    setMerging(true); setMergeError(false)
    try { await mergePlayers(mergeFrom, selected); setConfirmMerge(false); setMergeFrom(''); reload() }
    catch { setMergeError(true) }
    finally { setMerging(false) }
  }


  useFocusEffect(reload)

  const career = useMemo(() => {
    if (!selected) return null
    const player = players.find((p) => p.id === selected)
    if (!player) return null
    const ids = playerIdentityIds(player.id, players)
    let winners = 0
    let ues = 0
    let aces = 0
    let dfs = 0
    let matchesPlayed = 0
    let wins = 0
    let slice = emptyPointSlice()
    const history: { id: string; label: string; won: boolean; date: string; complete: boolean }[] = []

    for (const m of matches) {
      const idInMatch = playerIdInMatch({ match: m, ids })
      if (!idInMatch) continue
      if (m.state.isComplete) matchesPlayed += 1
      const stats = computePlayerStats(m.state).find((s) => ids.has(s.playerId))
      if (stats) {
        winners += stats.winners
        ues += stats.unforcedErrors
        aces += stats.aces
        dfs += stats.doubleFaults
      }
      slice = addPointSlices(
        slice,
        computePlayerSlice({ state: m.state, playerId: idInMatch, situation }),
      )
      const side = sideOfPlayer(m.config, idInMatch)
      const won = m.state.isComplete && m.state.winner === side
      if (won) wins += 1
      const names = m.config.playerIds.map((id) => m.playerNames[id] ?? id)
      const label =
        m.config.format === 'singles'
          ? `${names[0]} vs ${names[1]}`
          : `${names[0]}/${names[1]} vs ${names[2]}/${names[3]}`
      history.push({ id: m.id, label, won, date: m.metadata.date, complete: m.state.isComplete })
    }

    return { winners, ues, aces, dfs, matchesPlayed, wins, history, slice }
  }, [selected, matches, players, situation])

  const playerList = (
    <Stack>
      {status === 'loading' && <Muted>{t('common.loading')}</Muted>}
      {status === 'error' && <><Muted>{t('common.loadFailed')}</Muted><AppButton onPress={reload}>{t('common.retry')}</AppButton></>}
      {status === 'ready' && players.length === 0 && <Muted>{t('profiles.empty')}</Muted>}
      {players.filter(p => !p.mergedInto).map((p) => (
        <AppButton
          key={p.id}
          variant={selected === p.id ? 'primary' : 'ghost'}
          onPress={() => setSelected(p.id)}
        >
          {p.name}
        </AppButton>
      ))}
    </Stack>
  )

  const careerPane =
    career && selected ? (
      <Stack $gap={12} style={{ marginTop: twoPane ? 0 : 24 }}>
        <PlayerHeading>{players.find((p) => p.id === selected)?.name}</PlayerHeading>
        <StatGrid>
          <StatCard $highlight>
            <StatSmall>{t('profiles.completed')}</StatSmall>
            <StatStrong>{career.matchesPlayed}</StatStrong>
          </StatCard>
          <StatCard $highlight>
            <StatSmall>{t('profiles.wins')}</StatSmall>
            <StatStrong>{career.wins}</StatStrong>
          </StatCard>
          <StatCard>
            <StatSmall>{t('profiles.winners')}</StatSmall>
            <StatStrong>{career.winners}</StatStrong>
          </StatCard>
          <StatCard>
            <StatSmall>{t('profiles.ues')}</StatSmall>
            <StatStrong>{career.ues}</StatStrong>
          </StatCard>
          <StatCard>
            <StatSmall>{t('profiles.aces')}</StatSmall>
            <StatStrong>{career.aces}</StatStrong>
          </StatCard>
          <StatCard>
            <StatSmall>{t('profiles.dfs')}</StatSmall>
            <StatStrong>{career.dfs}</StatStrong>
          </StatCard>
        </StatGrid>

        <Heading style={{ marginTop: 8 }}>{t('summary.situational')}</Heading>
        <Muted>{t('summary.sitHint')}</Muted>
        <StatSituationBar value={situation} onChange={setSituation} />
        <SliceStatGrid display={displayPointSlice(career.slice)} />

        <SelectField label={t('identity.merge')} value={mergeFrom} onChange={setMergeFrom}
          options={[{value:'',label:t('identity.choose')},...players.filter(p => !p.mergedInto && p.id !== selected).map(p => ({value:p.id,label:`${p.name} · ${p.id.slice(0,6)}`}))]} />
        <AppButton disabled={!mergeFrom || merging} onPress={() => { setMergeError(false); setConfirmMerge(true) }}>{t('identity.merge')}</AppButton>
        <Dialog visible={confirmMerge} transparent onRequestClose={() => !merging && setConfirmMerge(false)}>
          <OverlayBackdrop><OverlayCard accessibilityViewIsModal><OverlayTitle>{t('identity.confirm')}</OverlayTitle><OverlaySub>{t('identity.mergeHint')}</OverlaySub>
            <OverlaySub>{players.find(p => p.id === mergeFrom)?.name} → {players.find(p => p.id === selected)?.name}</OverlaySub>
            {mergeError && <Muted>{t('identity.mergeFailed')}</Muted>}
            <AppButton disabled={merging} onPress={() => setConfirmMerge(false)}>{t('common.cancel')}</AppButton>
            <AppButton variant="danger" disabled={merging} onPress={() => void merge()}>{t('identity.confirm')}</AppButton>
          </OverlayCard></OverlayBackdrop>
        </Dialog>
        <Heading style={{ marginTop: 8 }}>{t('profiles.log')}</Heading>
        <Stack>
          {career.history.map((h) => (
            <AppButton
              key={h.id}
              variant="ghost"
              onPress={() => navigation.navigate(h.complete ? 'MatchSummary' : 'LiveMatch', { matchId: h.id })}
            >
              <LogWrap>
                <PlayerHeading style={{ fontSize: 18 }}>{h.label}</PlayerHeading>
                <LogSub>
                  {h.date} · {h.won ? t('profiles.won') : t('profiles.played')}
                </LogSub>
              </LogWrap>
            </AppButton>
          ))}
        </Stack>
      </Stack>
    ) : null

  return (
    <Screen>
      <ScreenTopBar
        label={t('common.home')}
        onPress={() => navigation.navigate('Home')}
        testID="screen-home"
      />
      <Title>{t('profiles.title')}</Title>
      <Sub>{t('profiles.sub')}</Sub>
      {careerPane && twoPane ? (
        <TwoPane a={playerList} b={careerPane} />
      ) : (
        <>
          {playerList}
          {careerPane}
        </>
      )}
    </Screen>
  )
}
