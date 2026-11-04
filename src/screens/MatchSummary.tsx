import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MatchRecap } from '../components/MatchRecap'
import { MatchStatsPanel } from '../components/MatchStatsPanel'
import { getMatch, type MatchRecord, saveMatch } from '../db'
import {
  type CourtSurface,
  formatSetScore,
  playersOnSide,
  type Side,
  type TimeOfDay,
  undoLastPoint,
  undoWalkover,
} from '../engine'
import { surfaceTxKey, todTxKey } from '../i18n'
import { useT } from '../i18n/useT'
import { computePlayerStats, computeSideStats } from '../stats/compute'
import {
  Button,
  Field,
  Page,
  Row,
  ScreenTopBar,
  Stack,
  StatCard,
  StatGrid,
  Sub,
} from '../styles/ui'
import { formatMatchClock, matchElapsedMs } from '../utils/matchClock'
import { withMatchMetadata } from '../utils/matchMetadata'

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${n}%`
}

export function MatchSummary() {
  const t = useT()
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState<MatchRecord | null>(null)
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
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
    setRecord(null)
    setLoadStatus('loading')
    void getMatch(matchId ?? '').then(
      (m) => {
        if (!cancelled) {
          setRecord(m ?? null)
          setLoadStatus(m ? 'ready' : 'missing')
        }
      },
      () => {
        if (!cancelled) setLoadStatus('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [matchId, reload])

  const sideStats = useMemo(() => (record ? computeSideStats(record.state) : []), [record])
  const playerStats = useMemo(() => (record ? computePlayerStats(record.state) : []), [record])

  if (!record) {
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
        {loadStatus !== 'loading' && (
          <Button onClick={() => setReload((n) => n + 1)}>{t('common.retry')}</Button>
        )}
        <Button as={Link} to="/app">
          {t('common.home')}
        </Button>
      </Page>
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
    } catch {
      setSaveError(true)
    } finally {
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
      navigate(`/match/${record.id}`, { replace: true })
    } catch {
      setSaveError(true)
    } finally {
      setUndoing(false)
    }
  }

  return (
    <Page>
      <ScreenTopBar>
        <Button as={Link} to="/app" $variant="ghost" style={{ textDecoration: 'none' }}>
          {t('common.home')}
        </Button>
      </ScreenTopBar>
      {saveError && <p role="alert">{t('common.saveFailed')}</p>}
      <h2 style={{ fontSize: '2.6rem' }}>{t('summary.title')}</h2>
      <Sub>
        {t('summary.vs', { a: sideName('a'), b: sideName('b') })}
        {winner ? ` · ${t('summary.winner', { name: sideName(winner) })}` : ''}
        {record.state.endedBy === 'walkover' ? ` · ${t('summary.walkover')}` : ''}
        {` · ${duration}`}
      </Sub>

      <Row $gap="0.4rem" style={{ marginBottom: '1rem' }}>
        {record.state.sets
          .filter((s) => s.completed)
          .map((s, i) => (
            <span key={i} className="display" style={{ fontSize: '1.8rem' }}>
              {formatSetScore(s)}
            </span>
          ))}
      </Row>

      {editingDetails ? (
        <Stack $gap="0.75rem" style={{ marginBottom: '1rem' }} data-testid="match-details-editor">
          <Field>
            {t('summary.date')}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="edit-date"
            />
          </Field>
          <Field>
            {t('summary.timeOfDay')}
            <select
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
              data-testid="edit-time-of-day"
            >
              {(['morning', 'afternoon', 'evening', 'night'] as TimeOfDay[]).map((tod) => (
                <option key={tod} value={tod}>
                  {t(todTxKey(tod))}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            {t('summary.weather')}
            <input
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              placeholder={t('new.weatherPlaceholder')}
              data-testid="edit-weather"
            />
          </Field>
          <Field>
            {t('summary.surface')}
            <select
              value={surface}
              onChange={(e) => setSurface(e.target.value as CourtSurface)}
              data-testid="edit-surface"
            >
              {(['hard', 'concrete', 'clay', 'grass', 'carpet', 'indoor'] as CourtSurface[]).map(
                (s) => (
                  <option key={s} value={s}>
                    {t(surfaceTxKey(s))}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Row $gap="0.5rem" $wrap>
            <Button
              type="button"
              $variant="accent"
              disabled={savingDetails || !date}
              onClick={() => void saveDetails()}
              data-testid="save-match-details"
            >
              {savingDetails ? t('summary.saving') : t('summary.saveDetails')}
            </Button>
            <Button
              type="button"
              $variant="ghost"
              disabled={savingDetails}
              onClick={() => setEditingDetails(false)}
            >
              {t('summary.cancel')}
            </Button>
          </Row>
        </Stack>
      ) : (
        <Row $gap="0.5rem" $wrap style={{ marginBottom: '0.25rem', alignItems: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {[
              record.metadata.date,
              record.metadata.courtSurface,
              record.metadata.weather,
              record.metadata.timeOfDay,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <Button
            type="button"
            $variant="ghost"
            onClick={beginEditDetails}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
            data-testid="edit-match-details"
          >
            {t('summary.editDetails')}
          </Button>
        </Row>
      )}

      <div style={{ marginTop: '1.25rem' }}>
        <MatchStatsPanel state={record.state} nameOf={nameOf} />
      </div>

      <Button
        type="button"
        $variant="ghost"
        onClick={() => setShowRecap((open) => !open)}
        aria-expanded={showRecap}
        data-testid="toggle-recap"
        style={{ marginTop: '0.65rem' }}
      >
        {showRecap ? t('summary.hideRecap') : t('summary.showRecap')}
      </Button>
      {showRecap && (
        <div style={{ marginTop: '1rem' }}>
          <MatchRecap state={record.state} nameOf={nameOf} sideName={sideName} />
        </div>
      )}

      <Button
        type="button"
        $variant="ghost"
        onClick={() => setDetail((d) => !d)}
        aria-expanded={detail}
        data-testid="toggle-detailed-stats"
        style={{ marginTop: '0.65rem' }}
      >
        {detail ? t('summary.hideDetail') : t('summary.showDetail')}
      </Button>

      {detail && (
        <Stack $gap="1.25rem" style={{ marginTop: '1rem' }}>
          {sideStats.map((s) => (
            <div key={`d-${s.side}`}>
              <h3 style={{ fontSize: '1.4rem' }}>
                {t('summary.detail', { name: sideName(s.side) })}
              </h3>
              <StatGrid>
                <StatCard>
                  <small>{t('summary.acePct')}</small>
                  <strong>{fmt(s.acePct)}</strong>
                </StatCard>
                <StatCard>
                  <small>{t('summary.dfPct')}</small>
                  <strong>{fmt(s.doubleFaultPct)}</strong>
                </StatCard>
                <StatCard>
                  <small>{t('summary.firstWin')}</small>
                  <strong>{fmt(s.firstServeWinPct)}</strong>
                </StatCard>
                <StatCard>
                  <small>{t('summary.secondWin')}</small>
                  <strong>{fmt(s.secondServeWinPct)}</strong>
                </StatCard>
                <StatCard>
                  <small>{t('summary.bpSaved')}</small>
                  <strong>{s.breakPointsSaved}</strong>
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
                <StatCard>
                  <small>{t('summary.serviceGames')}</small>
                  <strong>{s.serviceGamesWon}</strong>
                </StatCard>
                <StatCard>
                  <small>{t('summary.firstReturn')}</small>
                  <strong>{fmt(s.firstReturnWinPct)}</strong>
                </StatCard>
                <StatCard>
                  <small>{t('summary.secondReturn')}</small>
                  <strong>{fmt(s.secondReturnWinPct)}</strong>
                </StatCard>
                <StatCard>
                  <small>{t('summary.returnGames')}</small>
                  <strong>{s.returnGamesWon}</strong>
                </StatCard>
                <StatCard>
                  <small>{t('summary.pressure')}</small>
                  <strong>{s.pressurePointsWon}</strong>
                </StatCard>
                <StatCard>
                  <small>{t('summary.servicePts')}</small>
                  <strong>{s.servicePointsWon}</strong>
                </StatCard>
                <StatCard>
                  <small>{t('summary.returnPts')}</small>
                  <strong>{s.returnPointsWon}</strong>
                </StatCard>
                <StatCard>
                  <small>{t('summary.maxPts')}</small>
                  <strong>{s.maxPointsInARow}</strong>
                </StatCard>
                <StatCard>
                  <small>{t('summary.gamesWon')}</small>
                  <strong>{s.totalGamesWon}</strong>
                </StatCard>
                <StatCard>
                  <small>{t('summary.maxGames')}</small>
                  <strong>{s.maxGamesInARow}</strong>
                </StatCard>
              </StatGrid>
            </div>
          ))}

          <h3 style={{ fontSize: '1.4rem' }}>{t('summary.byPlayer')}</h3>
          {playerStats.map((p) => (
            <div
              key={p.playerId}
              style={{ borderTop: '1px solid var(--line)', paddingTop: '0.75rem' }}
            >
              <strong>{nameOf(p.playerId)}</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
                {t('summary.playerLine', {
                  winners: p.winners,
                  ues: p.unforcedErrors,
                  aces: p.aces,
                  dfs: p.doubleFaults,
                  pts: p.totalPointsWon,
                })}
              </div>
            </div>
          ))}
        </Stack>
      )}

      <Stack style={{ marginTop: '1.5rem' }}>
        <Button
          as={Link}
          to={`/new?from=${record.id}`}
          $variant="accent"
          style={{ textAlign: 'center', textDecoration: 'none' }}
          data-testid="rematch-btn"
        >
          {t('summary.rematch')}
        </Button>
        {(record.state.endedBy === 'walkover' ||
          (record.state.isComplete && record.state.events.length > 0)) && (
          <Button
            type="button"
            $variant="ghost"
            disabled={undoing}
            onClick={() => void undoLast()}
            data-testid="undo-last-point"
          >
            {undoing
              ? t('summary.undoing')
              : record.state.endedBy === 'walkover'
                ? t('summary.undoWalkover')
                : t('summary.undoLast')}
          </Button>
        )}
        <Button
          as={Link}
          to="/history"
          $variant="ghost"
          style={{ textAlign: 'center', textDecoration: 'none' }}
        >
          {t('summary.history')}
        </Button>
      </Stack>
    </Page>
  )
}
