/**
 * Award a walkover from the live match More menu (or settings).
 */
import { useState } from 'react'
import styled from 'styled-components'
import type { Side } from '../engine'
import { useT } from '../i18n/useT'
import { Button, Page, Row, Stack } from '../styles/ui'
import { Dialog } from './Dialog'

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
  gap: 0.75rem;
`

type WalkoverStep = 'pick' | 'confirm'

export function WalkoverOverlay(args: {
  sideName: (side: Side) => string
  onWalkover: (winnerSide: Side) => void
  onClose: () => void
}) {
  const t = useT()
  const [step, setStep] = useState<WalkoverStep>('pick')
  const [side, setSide] = useState<Side | null>(null)

  return (
    <Shell
      onDismiss={args.onClose}
      role="dialog"
      aria-label={t('live.walkover')}
      data-testid="walkover-overlay"
    >
      <Page>
        <Top>
          <h2 style={{ fontSize: '2rem', margin: 0 }}>{t('live.walkover')}</h2>
          <Button
            type="button"
            $variant="ghost"
            onClick={args.onClose}
            data-testid="close-walkover"
          >
            {t('common.cancel')}
          </Button>
        </Top>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 1rem', fontSize: '0.9rem' }}>
          {t('live.walkoverHint')}
        </p>
        {step === 'pick' && (
          <Stack $gap="0.5rem" data-testid="walkover-pick">
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('live.walkoverWho')}</p>
            <Row $gap="0.5rem" $wrap>
              {(['a', 'b'] as Side[]).map((winner) => (
                <Button
                  key={winner}
                  type="button"
                  $variant="ghost"
                  onClick={() => {
                    setSide(winner)
                    setStep('confirm')
                  }}
                  data-testid={`walkover-pick-${winner}`}
                >
                  {t('live.walkoverAward', { name: args.sideName(winner) })}
                </Button>
              ))}
            </Row>
          </Stack>
        )}
        {step === 'confirm' && side && (
          <Stack $gap="0.5rem" data-testid="walkover-confirm">
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {t('live.walkoverConfirm', { name: args.sideName(side) })}
            </p>
            <Row $gap="0.5rem" $wrap>
              <Button
                type="button"
                $variant="danger"
                onClick={() => {
                  args.onWalkover(side)
                  args.onClose()
                }}
                data-testid="confirm-walkover"
              >
                {t('live.walkoverConfirmAction')}
              </Button>
              <Button
                type="button"
                $variant="ghost"
                onClick={() => {
                  setSide(null)
                  setStep('pick')
                }}
                data-testid="walkover-back"
              >
                {t('live.walkoverBack')}
              </Button>
            </Row>
          </Stack>
        )}
      </Page>
    </Shell>
  )
}
