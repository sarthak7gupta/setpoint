/** Mic chip for tap-to-talk scoring (`useVoiceScoring`). */
import styled, { css } from 'styled-components'
import { MicIcon } from './controlIcons'

const Chip = styled.button<{ $listening?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  border-radius: 999px;
  cursor: pointer;
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  ${(p) =>
    p.$listening &&
    css`
      border-color: var(--accent);
      color: var(--accent);
    `}
`

export function VoiceListenButton(args: {
  listening: boolean
  supported: boolean
  disabled?: boolean
  onToggle: () => void
  label: string
  title?: string
}) {
  return (
    <Chip
      type="button"
      $listening={args.listening}
      onClick={args.onToggle}
      disabled={args.disabled || !args.supported}
      data-testid="voice-listen"
      title={args.title}
      aria-label={args.label}
      aria-pressed={args.listening}
    >
      <MicIcon />
    </Chip>
  )
}
