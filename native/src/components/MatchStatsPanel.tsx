/** Serve / return / pressure panel used live and post-match. */
import { useMemo, useState } from 'react'
import styled from 'styled-components/native'
import { playersOnSide, type MatchState, type Side } from '../engine'
import { useT } from '../i18n/useT'
import type { TxKey } from '../i18n'
import { useLayout } from '../layout/useLayout'
import {
  computePlayerSlice,
  computeSideSlices,
  computeSideStats,
  displayPointSlice,
  type SideStats,
  type StatSituation,
} from '../stats/compute'
import { Heading, Muted, Stack, StatCard, StatGrid, StatSmall, StatStrong, TwoPane } from '../styles/ui'
import { SliceStatGrid } from './SliceStatGrid'
import { StatSituationBar } from './StatSituationBar'

const SideName = styled.Text`
  font-family: ${(p) => p.theme.fontUiSemiBold};
  font-size: 16px;
  color: ${(p) => p.theme.text};
`

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${n}%`
}

function keyStatCards(
  s: SideStats,
  t: (key: TxKey) => string,
  formatPct: (n: number | null | undefined) => string,
) {
  return [
    <StatCard key="winners" $highlight>
      <StatSmall>{t('summary.winners')}</StatSmall>
      <StatStrong>{s.winners}</StatStrong>
    </StatCard>,
    <StatCard key="ues" $highlight>
      <StatSmall>{t('summary.ues')}</StatSmall>
      <StatStrong>{s.unforcedErrors}</StatStrong>
    </StatCard>,
    <StatCard key="first-in" $highlight>
      <StatSmall>{t('summary.firstIn')}</StatSmall>
      <StatStrong>{formatPct(s.firstServeInPct)}</StatStrong>
    </StatCard>,
    <StatCard key="points-won" $highlight>
      <StatSmall>{t('summary.pointsWon')}</StatSmall>
      <StatStrong>{s.totalPointsWon}</StatStrong>
    </StatCard>,
    <StatCard key="aces-dfs">
      <StatSmall>{t('summary.acesDfs')}</StatSmall>
      <StatStrong>
        {s.aces} / {s.doubleFaults}
      </StatStrong>
    </StatCard>,
    <StatCard key="break-points">
      <StatSmall>{t('summary.breakPoints')}</StatSmall>
      <StatStrong>{s.breakPointsWon}</StatStrong>
    </StatCard>,
    <StatCard key="two-pts-set">
      <StatSmall>{t('summary.twoPtsFromSetLost')}</StatSmall>
      <StatStrong>{s.setsTwoPointsAwayLost}</StatStrong>
    </StatCard>,
    <StatCard key="gp-missed-serve">
      <StatSmall>{t('summary.gpMissedServe')}</StatSmall>
      <StatStrong>{s.gamePointsMissedOnServe}</StatStrong>
    </StatCard>,
    <StatCard key="bp-missed-return">
      <StatSmall>{t('summary.bpMissedReturn')}</StatSmall>
      <StatStrong>{s.breakPointsMissedOnReturn}</StatStrong>
    </StatCard>,
  ]
}

export function MatchStatsPanel(args: {
  state: MatchState
  nameOf: (id: string) => string
}) {
  const t = useT()
  const { twoPane } = useLayout()
  const { state, nameOf } = args
  const [situation, setSituation] = useState<StatSituation>('all')
  const sideName = (side: Side) => playersOnSide(state.config, side).map(nameOf).join(' / ')
  const sideStats = useMemo(() => computeSideStats(state), [state])
  const sideSlices = useMemo(() => computeSideSlices(state, situation), [state, situation])
  const playerSlices = useMemo(
    () =>
      state.config.playerIds.map((playerId) => ({
        playerId,
        display: displayPointSlice(computePlayerSlice({ state, playerId, situation })),
      })),
    [state, situation],
  )

  return (
    <Stack $gap={12} testID="match-stats-panel">
      <Heading style={{ marginBottom: 0 }}>{t('summary.keyStats')}</Heading>
      {twoPane && sideStats.length === 2 ? (
        <TwoPane
          a={
            <Stack $gap={6}>
              <SideName>{sideName(sideStats[0].side)}</SideName>
              <StatGrid>{keyStatCards(sideStats[0], t, fmt)}</StatGrid>
            </Stack>
          }
          b={
            <Stack $gap={6}>
              <SideName>{sideName(sideStats[1].side)}</SideName>
              <StatGrid>{keyStatCards(sideStats[1], t, fmt)}</StatGrid>
            </Stack>
          }
        />
      ) : (
        sideStats.map((s) => (
          <Stack key={s.side} $gap={6}>
            <SideName>{sideName(s.side)}</SideName>
            <StatGrid>{keyStatCards(s, t, fmt)}</StatGrid>
          </Stack>
        ))
      )}

      <Heading style={{ marginTop: 4, marginBottom: 0 }}>{t('summary.situational')}</Heading>
      <Muted>{t('summary.sitHint')} {t('stats.explain')}</Muted>
      <StatSituationBar value={situation} onChange={setSituation} />
      {sideSlices.map((row) => (
        <Stack key={`sit-${row.side}`} $gap={6}>
          <SideName>{sideName(row.side)}</SideName>
          <SliceStatGrid display={row.display} />
        </Stack>
      ))}
      {playerSlices.length > 2 &&
        playerSlices.map((row) => (
          <Stack key={`sit-p-${row.playerId}`} $gap={6}>
            <SideName>{nameOf(row.playerId)}</SideName>
            <SliceStatGrid display={row.display} />
          </Stack>
        ))}
    </Stack>
  )
}
