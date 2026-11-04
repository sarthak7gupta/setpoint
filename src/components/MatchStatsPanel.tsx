/**
 * Serve / return / pressure panel used live and post-match.
 * Situation chips recompute slices without leaving the overlay.
 */
import { useMemo, useState } from 'react'
import { type MatchState, playersOnSide, type Side } from '../engine'
import { useT } from '../i18n/useT'
import {
  computePlayerSlice,
  computeSideSlices,
  computeSideStats,
  displayPointSlice,
  type StatSituation,
} from '../stats/compute'
import { StatCard, StatGrid } from '../styles/ui'
import { SliceStatGrid } from './SliceStatGrid'
import { StatSituationBar } from './StatSituationBar'

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${n}%`
}

export function MatchStatsPanel(args: { state: MatchState; nameOf: (id: string) => string }) {
  const t = useT()
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
    <div data-testid="match-stats-panel">
      <h3 style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>{t('summary.keyStats')}</h3>
      {sideStats.map((s) => (
        <div key={s.side} style={{ marginBottom: '1rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{sideName(s.side)}</div>
          <StatGrid>
            <StatCard $highlight>
              <small>{t('summary.winners')}</small>
              <strong>{s.winners}</strong>
            </StatCard>
            <StatCard $highlight>
              <small>{t('summary.ues')}</small>
              <strong>{s.unforcedErrors}</strong>
            </StatCard>
            <StatCard $highlight>
              <small>{t('summary.firstIn')}</small>
              <strong>{fmt(s.firstServeInPct)}</strong>
            </StatCard>
            <StatCard $highlight>
              <small>{t('summary.pointsWon')}</small>
              <strong>{s.totalPointsWon}</strong>
            </StatCard>
            <StatCard>
              <small>{t('summary.acesDfs')}</small>
              <strong>
                {s.aces} / {s.doubleFaults}
              </strong>
            </StatCard>
            <StatCard>
              <small>{t('summary.breakPoints')}</small>
              <strong>{s.breakPointsWon}</strong>
            </StatCard>
            <StatCard>
              <small>{t('summary.twoPtsFromSetLost')}</small>
              <strong>{s.setsTwoPointsAwayLost}</strong>
            </StatCard>
            <StatCard>
              <small>{t('summary.gpMissedServe')}</small>
              <strong>{s.gamePointsMissedOnServe}</strong>
            </StatCard>
            <StatCard>
              <small>{t('summary.bpMissedReturn')}</small>
              <strong>{s.breakPointsMissedOnReturn}</strong>
            </StatCard>
          </StatGrid>
        </div>
      ))}

      <h3 style={{ fontSize: '1.5rem', margin: '1.25rem 0 0.5rem' }}>{t('summary.situational')}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
        {t('summary.sitHint')} {t('stats.explain')}
      </p>
      <StatSituationBar value={situation} onChange={setSituation} />
      {sideSlices.map((row) => (
        <div key={`sit-${row.side}`} style={{ marginTop: '1rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{sideName(row.side)}</div>
          <SliceStatGrid display={row.display} />
        </div>
      ))}
      {playerSlices.length > 2 && (
        <div style={{ marginTop: '1rem' }}>
          {playerSlices.map((row) => (
            <div key={`sit-p-${row.playerId}`} style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{nameOf(row.playerId)}</div>
              <SliceStatGrid display={row.display} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
