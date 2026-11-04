import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useT } from '../i18n/useT'
import { Button, Field, Page, ScreenTopBar, Stack, Sub } from '../styles/ui'
import {
  resolveWatchInput,
  scanWatchNetwork,
  WATCH_PORT,
  WATCH_SCAN_PORTS,
  type WatchFound,
} from '../watch'
import { discoverLocalIpv4s, subnetBasesFromIps } from '../watch/localIps'

export function WatchMatch() {
  const t = useT()
  const navigate = useNavigate()
  const [scanning, setScanning] = useState(false)
  const [found, setFound] = useState<WatchFound[]>([])
  const [scanned, setScanned] = useState(false)
  const [manual, setManual] = useState('')
  const [error, setError] = useState<string | null>(null)

  const openWatch = (url: string) => {
    navigate(`/watch/live?src=${encodeURIComponent(url)}`)
  }

  const scan = async () => {
    setScanning(true)
    setError(null)
    setFound([])
    try {
      const ips = await discoverLocalIpv4s()
      const bases = subnetBasesFromIps(ips)
      if (bases.length === 0) {
        setScanned(true)
        setError(t('watch.noWifi'))
        return
      }
      const ports =
        typeof window !== 'undefined' && window.location.port
          ? Array.from(new Set([WATCH_PORT, Number(window.location.port), ...WATCH_SCAN_PORTS]))
          : [...WATCH_SCAN_PORTS]
      const hits = await scanWatchNetwork({
        bases,
        ports,
        skipHost: ips[0],
        fetchFn: fetch,
        onFound: (hit) =>
          setFound((current) => {
            if (current.some((row) => row.snapshot.matchId === hit.snapshot.matchId)) return current
            return [...current, hit].sort((a, b) =>
              a.snapshot.label.localeCompare(b.snapshot.label),
            )
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
          openWatch(url)
          return
        }
      } catch {
        /* try next port */
      }
    }
    setError(t('watch.failed'))
  }

  return (
    <Page>
      <ScreenTopBar>
        <Button as={Link} to="/app" $variant="ghost" style={{ textDecoration: 'none' }}>
          {t('common.home')}
        </Button>
      </ScreenTopBar>
      <h2 style={{ fontSize: '2.4rem' }}>{t('watch.title')}</h2>
      <Sub>{t('watch.sub')}</Sub>
      <Stack $gap="0.65rem">
        <Button
          type="button"
          $variant="primary"
          onClick={() => void scan()}
          disabled={scanning}
          data-testid="watch-scan"
        >
          {scanning ? t('watch.scanning') : t('watch.scan')}
        </Button>
        {found.map((hit) => (
          <Button
            key={hit.snapshot.matchId}
            type="button"
            $variant="ghost"
            data-testid="watch-found"
            onClick={() => openWatch(hit.url)}
            style={{
              textAlign: 'left',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: '0.3rem',
            }}
          >
            <strong>{hit.snapshot.label}</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {hit.snapshot.state.isComplete ? t('watch.final') : t('watch.live')}
            </span>
          </Button>
        ))}
        {scanned && !scanning && found.length === 0 && !error && (
          <p style={{ color: 'var(--text-muted)' }}>{t('watch.empty')}</p>
        )}
        {error && <p style={{ color: 'var(--text-muted)' }}>{error}</p>}
        <Field>
          <span>{t('watch.manual')}</span>
          <input
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder={t('watch.addressPlaceholder')}
            data-testid="watch-address"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </Field>
        <Button
          type="button"
          $variant="ghost"
          onClick={() => void connectManual()}
          data-testid="watch-connect"
        >
          {t('watch.connect')}
        </Button>
      </Stack>
    </Page>
  )
}
