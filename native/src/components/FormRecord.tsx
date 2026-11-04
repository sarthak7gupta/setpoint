import styled from 'styled-components/native'
import { useT } from '../i18n/useT'
import type { FormResult, HeadToHead } from '../stats/form'

const Dots = styled.View`
  flex-direction: row;
  gap: 5px;
  align-items: center;
  margin-top: 6px;
`

const Dot = styled.View<{ $result: FormResult }>`
  width: 9px;
  height: 9px;
  border-radius: 5px;
  background-color: ${(p) =>
    p.$result === 'win' ? '#22c55e' : p.$result === 'loss' ? p.theme.danger : 'rgba(255, 255, 255, 0.22)'};
`

const H2H = styled.View`
  border-width: 1px;
  border-color: ${(p) => p.theme.line};
  border-radius: 14px;
  background-color: rgba(0, 0, 0, 0.25);
  padding: 12px 14px;
`

const H2HLabel = styled.Text`
  margin-bottom: 6px;
  font-size: 12px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${(p) => p.theme.textMuted};
  font-family: ${(p) => p.theme.fontUi};
`

const H2HScore = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`

const SideName = styled.Text<{ $right?: boolean }>`
  flex: 1;
  font-size: 14px;
  font-family: ${(p) => p.theme.fontUiSemiBold};
  color: ${(p) => p.theme.text};
  text-align: ${(p) => (p.$right ? 'right' : 'left')};
`

const Score = styled.Text`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 27px;
  letter-spacing: 0.6px;
  color: ${(p) => p.theme.text};
`

export function FormDots(args: { results: FormResult[]; testId?: string }) {
  return (
    <Dots testID={args.testId}>
      {args.results.map((result, index) => (
        <Dot key={index} $result={result} />
      ))}
    </Dots>
  )
}

export function HeadToHeadCard(args: { labelA: string; labelB: string; h2h: HeadToHead }) {
  const t = useT()
  const meetings = args.h2h.meetings === 1 ? t('h2h.one') : t('h2h.many', { n: args.h2h.meetings })
  return (
    <H2H testID="head-to-head">
      <H2HLabel>{t('h2h.label', { meetings })}</H2HLabel>
      <H2HScore>
        <SideName numberOfLines={1}>{args.labelA}</SideName>
        <Score>
          {args.h2h.winsA}–{args.h2h.winsB}
        </Score>
        <SideName $right numberOfLines={1}>
          {args.labelB}
        </SideName>
      </H2HScore>
    </H2H>
  )
}
