import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { filterMatchHistory, validDateRange } from '../../shared/utils/historyFilters'
import { deleteMatch, listMatches, type MatchRecord } from '../db'
import { formatSetScore } from '../engine'
import { useT } from '../i18n/useT'
import { useLayout } from '../layout/useLayout'
import {
  Button,
  Field,
  MatchStatus,
  Overlay,
  OverlayCard,
  Page,
  Row,
  ScreenTopBar,
  Sub,
} from '../styles/ui'

function matchLabel(m: MatchRecord): string {
  const names = m.config.playerIds.map((id) => m.playerNames[id] ?? id)
  return m.config.format === 'singles'
    ? `${names[0]} vs ${names[1]}`
    : `${names[0]}/${names[1]} vs ${names[2]}/${names[3]}`
}

export function History() {
  const t = useT()
  const layout = useLayout()
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [pendingDelete, setPendingDelete] = useState<MatchRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const datesValid = validDateRange(from, to)
  const visible = filterMatchHistory(matches, { search, from, to, status: filterStatus })

  const reload = useCallback(() => {
    setStatus('loading')
    void listMatches().then(
      (m) => {
        setMatches(m)
        setStatus('ready')
      },
      () => setStatus('error'),
    )
  }, [])
  useEffect(() => {
    reload()
  }, [reload])

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteMatch(pendingDelete.id)
      setPendingDelete(null)
      reload()
    } catch {
      setError(true)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Page>
      <ScreenTopBar>
        <Button as={Link} to="/app" $variant="ghost" style={{ textDecoration: 'none' }}>
          {t('common.home')}
        </Button>
      </ScreenTopBar>
      <h2 style={{ fontSize: '2.4rem' }}>{t('history.title')}</h2>
      <Sub>{t('history.sub')}</Sub>
      <Row $wrap style={{ alignItems: 'end', marginBottom: '1rem' }}>
        <Field>
          {t('history.search')}
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
        <Field>
          {t('settings.exportFrom')}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field>
          {t('settings.exportTo')}
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field>
          {t('history.status')}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">{t('history.all')}</option>
            <option value="final">{t('home.final')}</option>
            <option value="ongoing">{t('home.inProgress')}</option>
          </select>
        </Field>
      </Row>
      {!datesValid && <p role="alert">{t('export.dateError')}</p>}
      {status === 'loading' && <p role="status">{t('common.loading')}</p>}
      {status === 'error' && (
        <div role="alert">
          <p>{t('common.loadFailed')}</p>
          <Button onClick={reload}>{t('common.retry')}</Button>
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${layout.historyColumns}, 1fr)`,
          gap: '0.75rem',
        }}
      >
        {status === 'ready' && visible.length === 0 && (
          <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
            {t(matches.length === 0 ? 'history.empty' : 'history.noResults')}
          </p>
        )}
        {visible.map((m) => {
          const label = matchLabel(m)
          const sets = m.state.sets
            .filter((s) => s.completed)
            .map((s) => formatSetScore(s))
            .join(', ')
          return (
            <div
              key={m.id}
              style={{
                border: '1px solid var(--line)',
                borderRadius: 14,
                padding: '0.85rem',
                background: 'rgba(0,0,0,0.22)',
              }}
            >
              <div style={{ fontWeight: 600 }}>{label}</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  marginTop: '0.35rem',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {m.metadata.date}
                  {sets ? ` · ${sets}` : ''}
                </span>
                <MatchStatus $complete={m.state.isComplete}>
                  {m.state.isComplete ? t('home.final') : t('home.inProgress')}
                </MatchStatus>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.65rem' }}>
                <Button
                  as={Link}
                  to={m.state.isComplete ? `/match/${m.id}/summary` : `/match/${m.id}`}
                  $variant="primary"
                  style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                >
                  {t('history.open')}
                </Button>
                <Button
                  type="button"
                  $variant="danger"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  onClick={() => setPendingDelete(m)}
                  data-testid="delete-match"
                >
                  {t('history.delete')}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
      {pendingDelete && (
        <Overlay
          onDismiss={deleting ? undefined : () => setPendingDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t('history.deleteTitle')}
          data-testid="delete-match-dialog"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setPendingDelete(null)
          }}
        >
          <OverlayCard>
            {error && <p role="alert">{t('common.saveFailed')}</p>}
            <h2>{t('history.deleteTitle')}</h2>
            <p>
              {t('history.deleteBody', {
                label: `${matchLabel(pendingDelete)}${
                  pendingDelete.metadata.date ? ` · ${pendingDelete.metadata.date}` : ''
                }`,
              })}
            </p>
            <Row $gap="0.5rem" style={{ justifyContent: 'center' }}>
              <Button
                type="button"
                $variant="ghost"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
                data-testid="cancel-delete-match"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                $variant="danger"
                disabled={deleting}
                onClick={() => void confirmDelete()}
                data-testid="confirm-delete-match"
              >
                {deleting ? t('history.deleting') : t('history.delete')}
              </Button>
            </Row>
          </OverlayCard>
        </Overlay>
      )}
    </Page>
  )
}
