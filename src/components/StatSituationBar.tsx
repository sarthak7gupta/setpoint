/** Chip bar for live / summary / profile situational stats. */
import styled from 'styled-components'
import type { TxKey } from '../i18n'
import { useT } from '../i18n/useT'
import { STAT_SITUATIONS, type StatSituation } from '../stats/compute'
import { Button, Row } from '../styles/ui'

export const SITUATION_KEYS: Record<StatSituation, TxKey> = {
  all: 'summary.sit.all',
  pressure: 'summary.sit.pressure',
  breakPointServe: 'summary.sit.bpServe',
  breakPointReturn: 'summary.sit.bpReturn',
  gamePoint: 'summary.sit.gamePoint',
  setPoint: 'summary.sit.setPoint',
  matchPoint: 'summary.sit.matchPoint',
  tiebreak: 'summary.sit.tiebreak',
  finalSet: 'summary.sit.finalSet',
}

const Chip = styled(Button)`
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-radius: 999px;
`

export function StatSituationBar(args: {
  value: StatSituation
  onChange: (situation: StatSituation) => void
}) {
  const t = useT()
  return (
    <Row $wrap $gap="0.4rem" data-testid="stat-situation-bar">
      {STAT_SITUATIONS.map((situation) => (
        <Chip
          key={situation}
          type="button"
          $variant={args.value === situation ? 'accent' : 'ghost'}
          onClick={() => args.onChange(situation)}
          data-testid={`stat-situation-${situation}`}
          aria-pressed={args.value === situation}
        >
          {t(SITUATION_KEYS[situation])}
        </Chip>
      ))}
    </Row>
  )
}
