/**
 * Live-match point-by-point recap sheet (same content as Match Summary recap).
 */
import styled from 'styled-components'
import type { MatchState, Side } from '../engine'
import { useT } from '../i18n/useT'
import { Button, Page } from '../styles/ui'
import { Dialog } from './Dialog'
import { MatchRecap } from './MatchRecap'

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

export function LiveRecapOverlay(args: {
  state: MatchState
  nameOf: (id: string) => string
  sideName: (side: Side) => string
  onClose: () => void
}) {
  const t = useT()

  return (
    <Shell
      onDismiss={args.onClose}
      role="dialog"
      aria-label={t('live.recap')}
      data-testid="live-recap"
    >
      <Page style={{ paddingTop: '0.85rem', paddingBottom: '1.5rem', maxWidth: 640 }}>
        <Top>
          <h2 style={{ fontSize: '2rem', margin: 0 }}>{t('live.recap')}</h2>
          <Button
            type="button"
            $variant="accent"
            onClick={args.onClose}
            data-testid="close-live-recap"
          >
            {t('common.close')}
          </Button>
        </Top>
        <MatchRecap state={args.state} nameOf={args.nameOf} sideName={args.sideName} />
      </Page>
    </Shell>
  )
}
