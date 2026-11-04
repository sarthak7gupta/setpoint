/**
 * Live-match stats sheet (header chip, pause, or changeover). Same numbers as
 * Match Summary, including situational chips from `shared/stats/slices`.
 */
import styled from 'styled-components'
import type { MatchState } from '../engine'
import { useT } from '../i18n/useT'
import { Button, Page } from '../styles/ui'
import { Dialog } from './Dialog'
import { MatchStatsPanel } from './MatchStatsPanel'

const Shell = styled(Dialog)`
  position: fixed;
  inset: 0;
  z-index: 90;
  overflow: auto;
  background: var(--gradient, var(--bg-deep));
  padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
`

const Top = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`

export function LiveStatsOverlay(args: {
  state: MatchState
  nameOf: (id: string) => string
  onClose: () => void
}) {
  const t = useT()

  return (
    <Shell
      onDismiss={args.onClose}
      role="dialog"
      aria-label={t('live.stats')}
      data-testid="live-stats"
    >
      <Page style={{ paddingTop: '0.85rem', paddingBottom: '1.5rem' }}>
        <Top>
          <h2 style={{ fontSize: '2rem', margin: 0 }}>{t('live.stats')}</h2>
          <Button
            type="button"
            $variant="accent"
            onClick={args.onClose}
            data-testid="close-live-stats"
          >
            {t('common.close')}
          </Button>
        </Top>
        <MatchStatsPanel state={args.state} nameOf={args.nameOf} />
      </Page>
    </Shell>
  )
}
