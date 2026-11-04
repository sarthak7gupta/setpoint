import styled from 'styled-components'
import type { FormResult, HeadToHead } from '../stats/form'

const Dots = styled.div`
  display: flex;
  gap: 0.28rem;
  align-items: center;
  margin-top: 0.4rem;
`

const Dot = styled.span<{ $result: FormResult }>`
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  flex: 0 0 auto;
  background: ${(p) =>
    p.$result === 'win'
      ? '#22c55e'
      : p.$result === 'loss'
        ? 'var(--danger, #e85d6a)'
        : 'rgba(255, 255, 255, 0.22)'};
`

const H2H = styled.div`
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.25);
  padding: 0.75rem 0.9rem;
`

const H2HLabel = styled.p`
  margin: 0 0 0.4rem;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
`

const H2HScore = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.65rem;
`

const SideName = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &:last-of-type {
    text-align: right;
  }
`

const Score = styled.span`
  font-family: var(--font-display);
  font-size: 1.7rem;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
`

export function FormDots(args: { results: FormResult[]; testId?: string }) {
  const spoken = args.results
    .map((result) => (result === 'win' ? 'win' : result === 'loss' ? 'loss' : 'none'))
    .join(', ')
  return (
    <Dots data-testid={args.testId} aria-label={`Recent form: ${spoken}`}>
      {args.results.map((result, index) => (
        <Dot key={index} $result={result} data-result={result} />
      ))}
    </Dots>
  )
}

export function HeadToHeadCard(args: { labelA: string; labelB: string; h2h: HeadToHead }) {
  const meetings = args.h2h.meetings === 1 ? '1 meeting' : `${args.h2h.meetings} meetings`
  return (
    <H2H data-testid="head-to-head">
      <H2HLabel>Head-to-head · {meetings}</H2HLabel>
      <H2HScore>
        <SideName>{args.labelA}</SideName>
        <Score>
          {args.h2h.winsA}–{args.h2h.winsB}
        </Score>
        <SideName>{args.labelB}</SideName>
      </H2HScore>
    </H2H>
  )
}
