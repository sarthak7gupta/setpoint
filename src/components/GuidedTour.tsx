/**
 * First-run walkthrough on Home. Skipped for installs that already had settings.
 */
import { useState } from 'react'
import styled from 'styled-components'
import { useT } from '../i18n/useT'
import { Button, Row, Stack } from '../styles/ui'
import { Dialog } from './Dialog'

const Shell = styled(Dialog)`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right))
    max(1.25rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
`

const Card = styled.div`
  width: min(28rem, 100%);
  background: var(--bg-elevated, var(--bg));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  border-radius: 1rem;
  padding: 1.25rem 1.35rem 1.15rem;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
`

const StepDots = styled.div`
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.85rem;
`

const Dot = styled.span<{ $active: boolean }>`
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: ${(p) => (p.$active ? 'var(--accent)' : 'var(--text-muted)')};
  opacity: ${(p) => (p.$active ? 1 : 0.35)};
`

const Title = styled.h2`
  margin: 0 0 0.45rem;
  font-size: 1.45rem;
  line-height: 1.15;
`

const Body = styled.p`
  margin: 0;
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.45;
`

const STEPS = [
  { title: 'tour.welcomeTitle', body: 'tour.welcomeBody' },
  { title: 'tour.newTitle', body: 'tour.newBody' },
  { title: 'tour.liveTitle', body: 'tour.liveBody' },
  { title: 'tour.moreTitle', body: 'tour.moreBody' },
] as const

export function GuidedTour(args: { onComplete: () => void }) {
  const t = useT()
  const [index, setIndex] = useState(0)
  const step = STEPS[index]
  const last = index === STEPS.length - 1

  return (
    <Shell
      onDismiss={args.onComplete}
      role="dialog"
      aria-label={t('tour.welcomeTitle')}
      data-testid="guided-tour"
    >
      <Card>
        <StepDots aria-hidden>
          {STEPS.map((item, i) => (
            <Dot key={item.title} $active={i === index} />
          ))}
        </StepDots>
        <Stack $gap="1rem">
          <div>
            <Title>{t(step.title)}</Title>
            <Body>{t(step.body)}</Body>
          </div>
          <Row $gap="0.5rem" $wrap style={{ justifyContent: 'space-between' }}>
            <Button
              type="button"
              $variant="ghost"
              onClick={args.onComplete}
              data-testid="tour-skip"
            >
              {t('tour.skip')}
            </Button>
            <Button
              type="button"
              $variant="accent"
              onClick={() => {
                if (last) args.onComplete()
                else setIndex((n) => n + 1)
              }}
              data-testid="tour-next"
            >
              {last ? t('tour.done') : t('tour.next')}
            </Button>
          </Row>
        </Stack>
      </Card>
    </Shell>
  )
}
