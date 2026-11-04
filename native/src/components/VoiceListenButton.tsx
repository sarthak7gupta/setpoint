/** Mic chip for tap-to-talk scoring (`useVoiceScoring`). Disabled in Expo Go. */
import styled, { useTheme } from 'styled-components/native'
import { FeedbackPressable } from '../styles/press'
import { MicIcon } from './controlIcons'

const Chip = styled(FeedbackPressable)<{ $listening?: boolean; $disabled?: boolean }>`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border-width: 1px;
  border-color: ${(p) => (p.$listening ? p.theme.accent : p.theme.line)};
  opacity: ${(p) => (p.$disabled ? 0.45 : 1)};
`

export function VoiceListenButton(args: {
  listening: boolean
  supported: boolean
  disabled?: boolean
  onToggle: () => void
  label: string
  accessibilityHint?: string
}) {
  const theme = useTheme()
  const disabled = Boolean(args.disabled || !args.supported)
  const color = args.listening ? theme.accent : theme.text
  return (
    <Chip
      onPress={args.onToggle}
      disabled={disabled}
      $listening={args.listening}
      $disabled={disabled}
      testID="voice-listen"
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: args.listening }}
      accessibilityLabel={args.label}
      accessibilityHint={args.accessibilityHint}
      hitSlop={8}
    >
      <MicIcon color={color} />
    </Chip>
  )
}
