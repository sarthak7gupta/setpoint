import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { Dialog } from '../components/Dialog'
import { useLayout } from '../layout/useLayout'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(196, 163, 90, 0.45); }
  50% { box-shadow: 0 0 0 8px rgba(196, 163, 90, 0); }
`

const PageInner = styled.div`
  margin: 0 auto;
  padding-top: 1.25rem;
  padding-bottom: 2.5rem;
  animation: ${fadeUp} 0.45s ease-out;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 100%;
  overscroll-behavior-y: none;
  width: 100%;
  box-sizing: border-box;
`

export function Page({
  children,
  style,
  className,
  ...rest
}: {
  children?: ReactNode
  style?: CSSProperties
  className?: string
} & HTMLAttributes<HTMLDivElement>) {
  const layout = useLayout()
  return (
    <PageInner
      className={className}
      style={{
        maxWidth: layout.contentMaxWidth,
        paddingLeft: layout.padH,
        paddingRight: layout.padH,
        ...style,
      }}
      {...rest}
    >
      {children}
    </PageInner>
  )
}

export function TwoPane({ a, b }: { a: ReactNode; b: ReactNode }) {
  const { twoPane } = useLayout()
  if (!twoPane) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {a}
        {b}
      </div>
    )
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '1.5rem',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>{a}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{b}</div>
    </div>
  )
}

export const ScreenTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 0.85rem;
`

export const Brand = styled.h1`
  font-size: clamp(2.8rem, 12vw, 4rem);
  line-height: 0.9;
  background: linear-gradient(
    120deg,
    var(--accent) 0%,
    var(--accent-soft) 35%,
    var(--text) 70%,
    var(--green-bright) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`

export const Sub = styled.p`
  color: var(--text-muted);
  margin: 0.4rem 0 1.5rem;
  font-size: 0.95rem;
`

export const Stack = styled.div<{ $gap?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.$gap ?? '0.75rem'};
`

export const Row = styled.div<{ $gap?: string; $wrap?: boolean }>`
  display: flex;
  gap: ${(p) => p.$gap ?? '0.5rem'};
  flex-wrap: ${(p) => (p.$wrap ? 'wrap' : 'nowrap')};
  align-items: center;
`

export const Button = styled.button<{
  $variant?: 'primary' | 'ghost' | 'danger' | 'warning' | 'accent'
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: var(--radius-btn, 12px);
  padding: 0.85rem 1.1rem;
  min-height: 44px;
  min-width: 44px;
  cursor: pointer;
  background: var(--bg-elevated);
  transition: transform 0.15s ease, background 0.15s ease;
  text-decoration: none;
  &:active { transform: scale(0.98); }
  &:disabled { opacity: 0.65; cursor: not-allowed; }
  ${(p) =>
    p.$variant === 'primary' &&
    css`
      background: linear-gradient(135deg, var(--button-primary-start, var(--purple-bright)), var(--button-primary-end, var(--purple)));
      border-color: transparent;
      color: var(--button-primary-text, var(--text));
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    `}
  ${(p) =>
    p.$variant === 'accent' &&
    css`
      background: linear-gradient(135deg, var(--button-accent-start, var(--accent)), var(--button-accent-end, var(--green-bright)));
      border-color: transparent;
      color: var(--button-accent-text, #0a1208);
      font-weight: 700;
    `}
  ${(p) =>
    p.$variant === 'danger' &&
    css`
      background: rgba(232, 93, 106, 0.22);
      border-color: var(--danger);
      color: var(--danger);
    `}
  ${(p) =>
    p.$variant === 'warning' &&
    css`
      background: rgba(240, 160, 75, 0.22);
      border-color: var(--warning);
      color: var(--warning);
    `}
  ${(p) =>
    p.$variant === 'ghost' &&
    css`
      background: transparent;
    `}
`

export const MatchStatus = styled.span<{ $complete: boolean }>`
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  line-height: 1.2;
  ${(p) =>
    p.$complete
      ? css`
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--line);
        `
      : css`
          color: var(--button-accent-text, #0a1208);
          background: var(--accent);
          border: 1px solid transparent;
        `}
`

const fieldControl = css`
  border: 1px solid var(--line);
  border-radius: var(--radius-sm, 10px);
  padding: 0.75rem 0.85rem;
  background: rgba(0,0,0,0.25);
  color: var(--text);
  text-transform: none;
  letter-spacing: normal;
  font-size: 1rem;
`

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  input, select, textarea {
    ${fieldControl}
  }
  textarea { min-height: 72px; resize: vertical; }
`

export const ScoreBoard = styled.div`
  border: 1px solid var(--line);
  border-radius: var(--radius-xl, 20px);
  padding: 1rem;
  background: rgba(0,0,0,0.28);
  backdrop-filter: blur(8px);
`

export const ServeStrip = styled.div<{ $pulse?: boolean }>`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
  ${(p) =>
    p.$pulse &&
    css`
      animation: ${pulse} 1.2s ease;
    `}
`

export const ServeBadge = styled.div<{ $kind: 'serve' | 'receive' }>`
  border-radius: var(--radius-card, 14px);
  padding: 0.65rem 0.75rem;
  background: ${(p) => (p.$kind === 'serve' ? 'rgba(204,255,0,0.12)' : 'rgba(142,197,255,0.12)')};
  border: 1px solid ${(p) => (p.$kind === 'serve' ? 'var(--serve)' : 'var(--receive)')};
  small {
    display: block;
    font-size: 0.65rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${(p) => (p.$kind === 'serve' ? 'var(--serve)' : 'var(--receive)')};
    margin-bottom: 0.15rem;
  }
  strong { font-size: 1rem; }
`

const pressureIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`

/** Slim TV-graphics style bug (not a hero banner). */
export const PressureBanner = styled.div<{
  $kind: 'break' | 'game' | 'set' | 'match' | 'deuce'
}>`
  display: inline-flex;
  align-self: center;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  max-width: 100%;
  margin: 0 auto 0.55rem;
  padding: 0.28rem 0.65rem;
  border-radius: 4px;
  animation: ${pressureIn} 0.22s ease-out;
  border-left: 3px solid
    ${(p) =>
      p.$kind === 'match'
        ? 'var(--accent)'
        : p.$kind === 'set'
          ? 'var(--purple-bright)'
          : p.$kind === 'break'
            ? 'var(--danger)'
            : p.$kind === 'deuce'
              ? 'var(--text-muted)'
              : 'var(--line)'};
  background: rgba(0, 0, 0, 0.55);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset;
`

export const PressureLine = styled.span`
  font-family: var(--font-ui);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.2;
  color: var(--text, #f4f7ef);
  white-space: nowrap;
  & + &::before {
    content: '·';
    margin-right: 0.35rem;
    opacity: 0.55;
    font-weight: 600;
  }
  & + & {
    color: var(--text-muted, #b7c4a8);
    font-weight: 600;
  }
`

export const BigPoints = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
  .pts {
    font-family: var(--font-display);
    font-size: 3.5rem;
    line-height: 1;
  }
  .vs {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
`

export const SetRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
  span {
    font-family: var(--font-display);
    font-size: 1.35rem;
    opacity: 0.85;
  }
`

export const Overlay = styled(Dialog)`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  z-index: 50;
  animation: ${fadeUp} 0.25s ease;
`

export const OverlayCard = styled.div<{ $wide?: boolean }>`
  width: min(${(p) => (p.$wide ? '560px' : '400px')}, 100%);
  max-height: ${(p) => (p.$wide ? '90vh' : 'none')};
  overflow: ${(p) => (p.$wide ? 'auto' : 'visible')};
  background: var(--bg-elevated);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl, 20px);
  padding: 1.5rem;
  text-align: ${(p) => (p.$wide ? 'left' : 'center')};
  h2 {
    font-size: ${(p) => (p.$wide ? '1.85rem' : '2.4rem')};
    margin-bottom: 0.4rem;
  }
  p {
    color: var(--text-muted);
    margin: 0 0 1rem;
  }
`

const StatGridInner = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${(p) => p.$columns}, 1fr);
  gap: 0.6rem;
`

export function StatGrid({
  children,
  style,
  className,
  $columns,
}: {
  children?: ReactNode
  style?: CSSProperties
  className?: string
  $columns?: number
}) {
  const layout = useLayout()
  return (
    <StatGridInner $columns={$columns ?? layout.statColumns} style={style} className={className}>
      {children}
    </StatGridInner>
  )
}

export const StatCard = styled.div<{ $highlight?: boolean }>`
  border-radius: var(--radius-card, 14px);
  padding: 0.85rem;
  background: ${(p) =>
    p.$highlight
      ? 'linear-gradient(145deg, rgba(204,255,0,0.12), rgba(0,0,0,0.28))'
      : 'rgba(0,0,0,0.25)'};
  border: 1px solid ${(p) => (p.$highlight ? 'var(--line)' : 'var(--line)')};
  small {
    display: block;
    color: var(--text-muted);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.25rem;
  }
  strong {
    font-family: var(--font-display);
    font-size: 1.6rem;
  }
`

export const NavBar = styled.nav`
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
  a, button {
    font-size: 0.8rem;
    padding: 0.45rem 0.7rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: transparent;
    text-decoration: none;
    color: var(--text-muted);
  }
  a.active, button.active {
    color: var(--text);
    border-color: var(--accent);
    background: rgba(0,0,0,0.2);
  }
`

export const Accordion = styled.details`
  border: 1px solid var(--line);
  border-radius: var(--radius-card, 14px);
  background: rgba(0,0,0,0.22);
  overflow: hidden;
  summary {
    list-style: none;
    cursor: pointer;
    padding: 0.9rem 1rem;
    font-family: var(--font-display);
    font-size: 1.35rem;
    letter-spacing: 0.04em;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
    &::-webkit-details-marker { display: none; }
    &::after {
      content: '+';
      font-family: var(--font-ui);
      font-size: 1.2rem;
      color: var(--accent-soft);
    }
  }
  &[open] summary::after { content: '−'; }
`

export const AccordionBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0 1rem 1rem;
`

export const PlayerSlot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

export const PlayerRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  input {
    flex: 1;
    min-width: 0;
    ${fieldControl}
  }
`

export const ReorderButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 0 0 auto;
`

export const ReorderBtn = styled.button`
  width: 2.4rem;
  flex: 1;
  min-height: 1.35rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(0,0,0,0.25);
  color: var(--text);
  font-size: 0.7rem;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  &:active:not(:disabled) {
    background: rgba(204, 255, 0, 0.15);
  }
`
