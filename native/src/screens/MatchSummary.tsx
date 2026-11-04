import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useEffect, useMemo, useState } from 'react'
import { MatchRecap } from '../components/MatchRecap'
import { MatchStatsPanel } from '../components/MatchStatsPanel'
import { getMatch, saveMatch, type MatchRecord } from '../db'
import {
  formatSetScore,
  playersOnSide,
  type CourtSurface,
  type Side,
  type TimeOfDay,
  undoLastPoint,
  undoWalkover,
} from '../engine'
import type { RootStackParamList } from '../navigation/types'
import { surfaceTxKey, todTxKey } from '../i18n'
import { computePlayerStats, computeSideStats } from '../stats/compute'
import {
  AppButton,
  DisplayScore,
  Field,
  Heading,
  Input,
  Muted,
  Row,
  Screen,
  ScreenTopBar,
  SelectField,
  Stack,
  StatCard,
  StatGrid,
  StatSmall,
  StatStrong,
  Sub,
  Title,
} from '../styles/ui'
import { formatMatchClock, matchElapsedMs } from '../utils/matchClock'
import { withMatchMetadata } from '../utils/matchMetadata'
import { useT } from '../i18n/useT'
import styled from 'styled-components/native'

type Props = NativeStackScreenProps<RootStackParamList, 'MatchSummary'>

const PlayerBlock = styled.View`
  border-top-width: 1px;
  border-top-color: ${(p) => p.theme.line};
  padding-top: 12px;
`

const PlayerName = styled.Text`
  font-family: ${(p) => p.theme.fontUiSemiBold};
  color: ${(p) => p.theme.text};
  font-size: 16px;
`

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${n}%`
}

export function MatchSummary({ navigation, route }: Props) {
  const t = useT()
  const { matchId } = route.params
  const [record, setRecord] = useState<MatchRecord | null>(null)
  const [loadStatus, setLoadStatus] = useState<'loading'|'ready'|'missing'|'error'>('loading')
  const [reload, setReload] = useState(0)
  const [saveError, setSaveError] = useState(false)
  const [detail, setDetail] = useState(false)
  const [showRecap, setShowRecap] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [date, setDate] = useState('')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('afternoon')
  const [weather, setWeather] = useState('')
  const [surface, setSurface] = useState<CourtSurface>('hard')
  const [savingDetails, setSavingDetails] = useState(false)
  const [undoing, setUndoing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setRecord(null); setLoadStatus('loading')
    void getMatch(matchId).then(m => {
      if (!cancelled) { setRecord(m ?? null); setLoadStatus(m ? 'ready' : 'missing') }
    }, () => { if (!cancelled) setLoadStatus('error') })
    return () => { cancelled = true }
  }, [matchId,reload])

  const sideStats = useMemo(() => (record ? computeSideStats(record.state) : []), [record])
  const playerStats = useMemo(() => (record ? computePlayerStats(record.state) : []), [record])

  if (!record) {
    return (
      <Screen>
        <ScreenTopBar
          label={t('common.home')}
          onPress={() => navigation.navigate('Home')}
        />
        <Muted>{t(loadStatus === 'error' ? 'common.loadFailed' : loadStatus === 'missing' ? 'common.missingMatch' : 'common.loading')}</Muted>
        {loadStatus !== 'loading' && <AppButton onPress={() => setReload(n => n+1)}>{t('common.retry')}</AppButton>}
      </Screen>
    )
  }

  const nameOf = (id: string) => record.playerNames[id] ?? id
  const sideName = (side: Side) => playersOnSide(record.config, side).map(nameOf).join(' / ')
  const winner = record.state.winner
  const duration = formatMatchClock(
    matchElapsedMs(record.state, {
      now: record.completedAt ?? Date.now(),
      fallbackStart: record.createdAt,
    }),
  )

  const beginEditDetails = () => {
    setDate(record.metadata.date)
    setTimeOfDay(record.metadata.timeOfDay ?? 'afternoon')
    setWeather(record.metadata.weather ?? '')
    setSurface(record.metadata.courtSurface ?? 'hard')
    setEditingDetails(true)
  }

  const saveDetails = async () => {
    if (!date) return
    setSavingDetails(true)
    try {
      const updated = withMatchMetadata({
        record,
        metadata: {
          ...record.metadata,
          date,
          timeOfDay,
          weather: weather.trim() || undefined,
          courtSurface: surface,
        },
        updatedAt: Date.now(),
      })
      await saveMatch(updated)
      setRecord(updated)
      setEditingDetails(false)
    } catch { setSaveError(true) } finally {
      setSavingDetails(false)
    }
  }

  const undoLast = async () => {
    const next =
      record.state.endedBy === 'walkover' ? undoWalkover(record.state) : undoLastPoint(record.state)
    if (!next) return
    setUndoing(true)
    try {
      const updated: MatchRecord = {
        ...record,
        state: next,
        undoHistory: [],
        updatedAt: Date.now(),
        completedAt: undefined,
      }
      await saveMatch(updated)
      navigation.replace('LiveMatch', { matchId: record.id })
    } catch { setSaveError(true) } finally {
      setUndoing(false)
    }
  }

  return (
    <Screen>
      <ScreenTopBar
        label={t('common.home')}
        onPress={() => navigation.navigate('Home')}
        testID="screen-home"
      />
      {saveError && <Muted accessibilityRole="alert">{t('common.saveFailed')}</Muted>}
      <Title>{t('summary.title')}</Title>
      <Sub>
        {t('summary.vs', { a: sideName('a'), b: sideName('b') })}
        {winner ? ` · ${t('summary.winner', { name: sideName(winner) })}` : ''}
        {record.state.endedBy === 'walkover' ? ` · ${t('summary.walkover')}` : ''}
        {` · ${duration}`}
      </Sub>

      <Row $gap={6} style={{ marginBottom: 16 }}>
        {record.state.sets
          .filter((s) => s.completed)
          .map((s, i) => (
            <DisplayScore key={i}>{formatSetScore(s)}</DisplayScore>
          ))}
      </Row>

      {editingDetails ? (
        <Stack $gap={12} style={{ marginBottom: 16 }} testID="match-details-editor">
          <Field label={t('summary.date')}>
            <Input value={date} onChangeText={setDate} testID="edit-date" placeholder="YYYY-MM-DD" />
          </Field>
          <SelectField
            label={t('summary.timeOfDay')}
            value={timeOfDay}
            onChange={setTimeOfDay}
            options={[
              { value: 'morning', label: t(todTxKey('morning')) },
              { value: 'afternoon', label: t(todTxKey('afternoon')) },
              { value: 'evening', label: t(todTxKey('evening')) },
              { value: 'night', label: t(todTxKey('night')) },
            ]}
          />
          <Field label={t('summary.weather')}>
            <Input
              value={weather}
              onChangeText={setWeather}
              placeholder={t('new.weatherPlaceholder')}
              testID="edit-weather"
            />
          </Field>
          <SelectField
            label={t('summary.surface')}
            value={surface}
            onChange={setSurface}
            options={[
              { value: 'hard', label: t(surfaceTxKey('hard')) },
              { value: 'concrete', label: t(surfaceTxKey('concrete')) },
              { value: 'clay', label: t(surfaceTxKey('clay')) },
              { value: 'grass', label: t(surfaceTxKey('grass')) },
              { value: 'carpet', label: t(surfaceTxKey('carpet')) },
              { value: 'indoor', label: t(surfaceTxKey('indoor')) },
            ]}
          />
          <Row $gap={8} $wrap>
            <AppButton
              variant="accent"
              disabled={savingDetails || !date}
              onPress={() => void saveDetails()}
              testID="save-match-details"
            >
              {savingDetails ? t('summary.saving') : t('summary.saveDetails')}
            </AppButton>
            <AppButton
              variant="ghost"
              disabled={savingDetails}
              onPress={() => setEditingDetails(false)}
            >
              {t('summary.cancel')}
            </AppButton>
          </Row>
        </Stack>
      ) : (
        <Row $gap={8} $wrap style={{ marginBottom: 4, alignItems: 'center' }}>
          <Muted>
            {[
              record.metadata.date,
              record.metadata.courtSurface
                ? t(surfaceTxKey(record.metadata.courtSurface))
                : null,
              record.metadata.weather,
              record.metadata.timeOfDay ? t(todTxKey(record.metadata.timeOfDay)) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Muted>
          <AppButton variant="ghost" onPress={beginEditDetails} testID="edit-match-details">
            {t('summary.editDetails')}
          </AppButton>
        </Row>
      )}

      <MatchStatsPanel state={record.state} nameOf={nameOf} />

      <AppButton
        variant="ghost"
        onPress={() => setShowRecap((open) => !open)}
        testID="toggle-recap"
        style={{ marginTop: 10 }}
      >
        {showRecap ? t('summary.hideRecap') : t('summary.showRecap')}
      </AppButton>
      {showRecap && (
        <Stack style={{ marginTop: 16 }}>
          <MatchRecap state={record.state} nameOf={nameOf} sideName={sideName} />
        </Stack>
      )}

      <AppButton
        variant="ghost"
        onPress={() => setDetail((d) => !d)}
        testID="toggle-detailed-stats"
        style={{ marginTop: 10 }}
      >
        {detail ? t('summary.hideDetail') : t('summary.showDetail')}
      </AppButton>

      {detail && (
        <Stack $gap={20} style={{ marginTop: 16 }}>
          {sideStats.map((s) => (
            <Stack key={`d-${s.side}`} $gap={8}>
              <Heading>{t('summary.detail', { name: sideName(s.side) })}</Heading>
              <StatGrid>
                <StatCard>
                  <StatSmall>{t('summary.acePct')}</StatSmall>
                  <StatStrong>{fmt(s.acePct)}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.dfPct')}</StatSmall>
                  <StatStrong>{fmt(s.doubleFaultPct)}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.firstWin')}</StatSmall>
                  <StatStrong>{fmt(s.firstServeWinPct)}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.secondWin')}</StatSmall>
                  <StatStrong>{fmt(s.secondServeWinPct)}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.bpSaved')}</StatSmall>
                  <StatStrong>{s.breakPointsSaved}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.twoPtsFromSetLost')}</StatSmall>
                  <StatStrong>{s.setsTwoPointsAwayLost}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.gpMissedServe')}</StatSmall>
                  <StatStrong>{s.gamePointsMissedOnServe}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.bpMissedReturn')}</StatSmall>
                  <StatStrong>{s.breakPointsMissedOnReturn}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.serviceGames')}</StatSmall>
                  <StatStrong>{s.serviceGamesWon}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.firstReturn')}</StatSmall>
                  <StatStrong>{fmt(s.firstReturnWinPct)}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.secondReturn')}</StatSmall>
                  <StatStrong>{fmt(s.secondReturnWinPct)}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.returnGames')}</StatSmall>
                  <StatStrong>{s.returnGamesWon}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.pressure')}</StatSmall>
                  <StatStrong>{s.pressurePointsWon}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.servicePts')}</StatSmall>
                  <StatStrong>{s.servicePointsWon}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.returnPts')}</StatSmall>
                  <StatStrong>{s.returnPointsWon}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.maxPts')}</StatSmall>
                  <StatStrong>{s.maxPointsInARow}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.gamesWon')}</StatSmall>
                  <StatStrong>{s.totalGamesWon}</StatStrong>
                </StatCard>
                <StatCard>
                  <StatSmall>{t('summary.maxGames')}</StatSmall>
                  <StatStrong>{s.maxGamesInARow}</StatStrong>
                </StatCard>
              </StatGrid>
            </Stack>
          ))}

          <Heading>{t('summary.byPlayer')}</Heading>
          {playerStats.map((p) => (
            <PlayerBlock key={p.playerId}>
              <PlayerName>{nameOf(p.playerId)}</PlayerName>
              <Muted style={{ marginTop: 6 }}>
                {t('summary.playerLine', {
                  winners: p.winners,
                  ues: p.unforcedErrors,
                  aces: p.aces,
                  dfs: p.doubleFaults,
                  pts: p.totalPointsWon,
                })}
              </Muted>
            </PlayerBlock>
          ))}
        </Stack>
      )}

      <Stack style={{ marginTop: 24 }}>
        <AppButton
          variant="accent"
          onPress={() => navigation.navigate('NewMatch', { from: record.id })}
          testID="rematch-btn"
        >
          {t('summary.rematch')}
        </AppButton>
        {(record.state.endedBy === 'walkover' ||
          (record.state.isComplete && record.state.events.length > 0)) && (
          <AppButton
            variant="ghost"
            disabled={undoing}
            onPress={() => void undoLast()}
            testID="undo-last-point"
          >
            {undoing
              ? t('summary.undoing')
              : record.state.endedBy === 'walkover'
                ? t('summary.undoWalkover')
                : t('summary.undoLast')}
          </AppButton>
        )}
        <AppButton variant="ghost" onPress={() => navigation.navigate('History')}>
          {t('summary.history')}
        </AppButton>
      </Stack>
    </Screen>
  )
}
