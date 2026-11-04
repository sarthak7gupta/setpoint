import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { playerIdentityIds } from '../../shared/utils/players'
import { SliceStatGrid } from '../components/SliceStatGrid'
import { StatSituationBar } from '../components/StatSituationBar'
import { listMatches, listPlayers, type MatchRecord, mergePlayers, type PlayerRecord } from '../db'
import { sideOfPlayer } from '../engine'
import { useT } from '../i18n/useT'
import { useLayout } from '../layout/useLayout'
import {
  addPointSlices,
  computePlayerSlice,
  computePlayerStats,
  displayPointSlice,
  emptyPointSlice,
  type StatSituation,
} from '../stats/compute'
import { playerIdInMatch } from '../stats/form'
import {
  Button,
  Field,
  Overlay,
  OverlayCard,
  Page,
  ScreenTopBar,
  Stack,
  StatCard,
  StatGrid,
  Sub,
  TwoPane,
} from '../styles/ui'

export function Profiles() {
  const t = useT()
  const layout = useLayout()
  const [players, setPlayers] = useState<PlayerRecord[]>([])
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [situation, setSituation] = useState<StatSituation>('all')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [mergeFrom, setMergeFrom] = useState('')
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState(false)
  const [confirmMerge, setConfirmMerge] = useState(false)
  const reload = useCallback(() => {
    setStatus('loading')
    void Promise.all([listPlayers(), listMatches()]).then(
      ([p, m]) => {
        setPlayers(p)
        setMatches(m)
        setStatus('ready')
      },
      () => setStatus('error'),
    )
  }, [])
  const merge = async () => {
    if (!selected || !mergeFrom) return
    setMerging(true)
    setMergeError(false)
    try {
      await mergePlayers(mergeFrom, selected)
      setConfirmMerge(false)
      setMergeFrom('')
      reload()
    } catch {
      setMergeError(true)
    } finally {
      setMerging(false)
    }
  }

  useEffect(reload, [reload])

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
    const history: { id: string; label: string; won: boolean; date: string; complete: boolean }[] =
      []

    for (const m of matches) {
      const idInMatch = playerIdInMatch({ match: m, ids })
      if (!idInMatch) continue
      if (m.state.isComplete) matchesPlayed += 1
      const stats = computePlayerStats(m.state).find((s) => s.playerId === idInMatch)
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
      {status === 'loading' && <p role="status">{t('common.loading')}</p>}
      {status === 'error' && (
        <div role="alert">
          <p>{t('common.loadFailed')}</p>
          <Button onClick={reload}>{t('common.retry')}</Button>
        </div>
      )}
      {status === 'ready' && players.length === 0 && (
        <p style={{ color: 'var(--text-muted)' }}>{t('profiles.empty')}</p>
      )}
      {players
        .filter((p) => !p.mergedInto)
        .map((p) => (
          <Button
            key={p.id}
            type="button"
            $variant={selected === p.id ? 'primary' : 'ghost'}
            onClick={() => setSelected(p.id)}
            style={{ textAlign: 'left', justifyContent: 'flex-start', width: '100%' }}
          >
            {p.name} · {p.id.slice(0, 6)}
          </Button>
        ))}
    </Stack>
  )

  const careerPane =
    career && selected ? (
      <div style={{ marginTop: layout.twoPane ? 0 : '1.5rem' }}>
        <h3 style={{ fontSize: '1.8rem' }}>{players.find((p) => p.id === selected)?.name}</h3>
        <StatGrid style={{ marginTop: '0.75rem' }}>
          <StatCard $highlight>
            <small>{t('profiles.completed')}</small>
            <strong>{career.matchesPlayed}</strong>
          </StatCard>
          <StatCard $highlight>
            <small>{t('profiles.wins')}</small>
            <strong>{career.wins}</strong>
          </StatCard>
          <StatCard>
            <small>{t('profiles.winners')}</small>
            <strong>{career.winners}</strong>
          </StatCard>
          <StatCard>
            <small>{t('profiles.ues')}</small>
            <strong>{career.ues}</strong>
          </StatCard>
          <StatCard>
            <small>{t('profiles.aces')}</small>
            <strong>{career.aces}</strong>
          </StatCard>
          <StatCard>
            <small>{t('profiles.dfs')}</small>
            <strong>{career.dfs}</strong>
          </StatCard>
        </StatGrid>

        <h3 style={{ fontSize: '1.3rem', marginTop: '1.25rem' }}>{t('summary.situational')}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.35rem 0 0.75rem' }}>
          {t('summary.sitHint')}
        </p>
        <StatSituationBar value={situation} onChange={setSituation} />
        <div style={{ marginTop: '0.85rem' }}>
          <SliceStatGrid display={displayPointSlice(career.slice)} />
        </div>

        <Field>
          {t('identity.merge')}
          <select
            value={mergeFrom}
            onChange={(e) => setMergeFrom(e.target.value)}
            disabled={merging}
          >
            <option value="">{t('identity.choose')}</option>
            {players
              .filter((p) => !p.mergedInto && p.id !== selected)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.id.slice(0, 6)}
                </option>
              ))}
          </select>
        </Field>
        <Button
          disabled={!mergeFrom || merging}
          onClick={() => {
            setMergeError(false)
            setConfirmMerge(true)
          }}
        >
          {t('identity.merge')}
        </Button>
        {confirmMerge && (
          <Overlay
            aria-label={t('identity.confirm')}
            onDismiss={merging ? undefined : () => setConfirmMerge(false)}
          >
            <OverlayCard>
              <h2>{t('identity.confirm')}</h2>
              <p>{t('identity.mergeHint')}</p>
              <p>
                {players.find((p) => p.id === mergeFrom)?.name} →{' '}
                {players.find((p) => p.id === selected)?.name}
              </p>
              {mergeError && <p role="alert">{t('identity.mergeFailed')}</p>}
              <Button disabled={merging} onClick={() => setConfirmMerge(false)}>
                {t('common.cancel')}
              </Button>
              <Button $variant="danger" disabled={merging} onClick={() => void merge()}>
                {t('identity.confirm')}
              </Button>
            </OverlayCard>
          </Overlay>
        )}
        <h3 style={{ fontSize: '1.3rem', marginTop: '1.25rem' }}>{t('profiles.log')}</h3>
        <Stack>
          {career.history.map((h) => (
            <Button
              key={h.id}
              as={Link}
              to={h.complete ? `/match/${h.id}/summary` : `/match/${h.id}`}
              $variant="ghost"
              style={{
                textAlign: 'left',
                textDecoration: 'none',
                justifyContent: 'flex-start',
                width: '100%',
              }}
            >
              <div>
                <div>{h.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {h.date} · {h.won ? t('profiles.won') : t('profiles.played')}
                </div>
              </div>
            </Button>
          ))}
        </Stack>
      </div>
    ) : null

  return (
    <Page>
      <ScreenTopBar>
        <Button as={Link} to="/app" $variant="ghost" style={{ textDecoration: 'none' }}>
          {t('common.home')}
        </Button>
      </ScreenTopBar>
      <h2 style={{ fontSize: '2.4rem' }}>{t('profiles.title')}</h2>
      <Sub>{t('profiles.sub')}</Sub>
      {careerPane && layout.twoPane ? (
        <TwoPane a={playerList} b={careerPane} />
      ) : (
        <>
          {playerList}
          {careerPane}
        </>
      )}
    </Page>
  )
}
