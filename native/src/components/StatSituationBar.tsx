/** Chip bar for live / summary / profile situational stats. */
import { STAT_SITUATIONS, type StatSituation } from '../stats/compute'
import { useT } from '../i18n/useT'
import type { TxKey } from '../i18n'
import { FeedbackPressable, Row } from '../styles/ui'
import styled from 'styled-components/native'

const SIT_KEY: Record<StatSituation, TxKey> = {
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

const Chip = styled(FeedbackPressable)<{ $on?: boolean }>`
  padding: 6px 12px;
  border-radius: 999px;
  border-width: 1px;
  border-color: ${(p) => (p.$on ? p.theme.accent : p.theme.line)};
  background-color: ${(p) => (p.$on ? p.theme.bgElevated : 'transparent')};
`

const ChipLabel = styled.Text<{ $on?: boolean }>`
  font-family: ${(p) => p.theme.fontUiSemiBold};
  font-size: 12px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: ${(p) => (p.$on ? p.theme.accent : p.theme.text)};
`

export function StatSituationBar(args: {
  value: StatSituation
  onChange: (situation: StatSituation) => void
}) {
  const t = useT()
  return (
    <Row $wrap $gap={6} testID="stat-situation-bar">
      {STAT_SITUATIONS.map((situation) => {
        const on = args.value === situation
        return (
          <Chip
            key={situation}
            $on={on}
            onPress={() => args.onChange(situation)}
            testID={`stat-situation-${situation}`}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(SIT_KEY[situation])}
            hitSlop={6}
          >
            <ChipLabel $on={on}>{t(SIT_KEY[situation])}</ChipLabel>
          </Chip>
        )
      })}
    </Row>
  )
}
