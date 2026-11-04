import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GuidedTour } from '../components/GuidedTour'
import { useApp } from '../context/AppContext'
import { listMatches, type MatchRecord } from '../db'
import { useT } from '../i18n/useT'
import { useLayout } from '../layout/useLayout'
import { Brand, Button, MatchStatus, Page, Stack, Sub, TwoPane } from '../styles/ui'

function matchNames(m: MatchRecord): string {
  const names = m.config.playerIds.map((id) => m.playerNames[id] ?? id)
  return m.config.format === 'singles'
    ? `${names[0]} vs ${names[1]}`
    : `${names[0]}/${names[1]} vs ${names[2]}/${names[3]}`
}

export function Home() {
  const t = useT()
  const layout = useLayout()
  const { ready, settings, updateSettings } = useApp()
  const [recent, setRecent] = useState<MatchRecord[]>([])
  const showTour = ready && !settings.hasCompletedTour

  useEffect(() => {
    void listMatches().then((m) => setRecent(m.slice(0, 5)))
  }, [])

  const completeTour = () => {
    void updateSettings({ hasCompletedTour: true })
  }

  const hero = (
    <>
      <Brand style={{ fontSize: layout.brandSize, lineHeight: 0.9 }}>SetPoint</Brand>
      <Sub>{t('home.tagline')}</Sub>
      <Stack $gap="0.65rem">
        <Button
          as={Link}
          to="/new"
          $variant="primary"
          style={{ textAlign: 'center', textDecoration: 'none' }}
        >
          {t('home.newMatch')}
        </Button>
        <Button
          as={Link}
          to="/watch"
          $variant="ghost"
          style={{ textAlign: 'center', textDecoration: 'none' }}
        >
          {t('home.watch')}
        </Button>
        <Button
          as={Link}
          to="/history"
          $variant="ghost"
          style={{ textAlign: 'center', textDecoration: 'none' }}
        >
          {t('home.history')}
        </Button>
        <Button
          as={Link}
          to="/profiles"
          $variant="ghost"
          style={{ textAlign: 'center', textDecoration: 'none' }}
        >
          {t('home.profiles')}
        </Button>
        <Button
          as={Link}
          to="/settings"
          $variant="ghost"
          style={{ textAlign: 'center', textDecoration: 'none' }}
        >
          {t('home.settings')}
        </Button>
      </Stack>
      <p style={{ margin: '1.8rem 0 0', textAlign: 'center' }}>
        <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {t('home.about')}
        </Link>
      </p>
    </>
  )

  const recentList =
    recent.length > 0 ? (
      <div style={{ marginTop: layout.twoPane ? 0 : '2rem' }}>
        <h2 style={{ fontSize: layout.twoPane ? '2rem' : '1.6rem', marginBottom: '0.75rem' }}>
          {t('home.recent')}
        </h2>
        <Stack>
          {recent.map((m) => (
            <Button
              key={m.id}
              as={Link}
              to={m.state.isComplete ? `/match/${m.id}/summary` : `/match/${m.id}`}
              $variant="ghost"
              style={{
                textAlign: 'left',
                textDecoration: 'none',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '0.45rem',
              }}
            >
              <div style={{ fontWeight: 600 }}>{matchNames(m)}</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {m.metadata.date}
                </span>
                <MatchStatus $complete={m.state.isComplete}>
                  {m.state.isComplete ? t('home.final') : t('home.inProgress')}
                </MatchStatus>
              </div>
            </Button>
          ))}
        </Stack>
      </div>
    ) : null

  return (
    <Page>
      {recentList && layout.twoPane ? (
        <TwoPane a={hero} b={recentList} />
      ) : (
        <>
          {hero}
          {recentList}
        </>
      )}
      {showTour && <GuidedTour onComplete={completeTour} />}
    </Page>
  )
}
