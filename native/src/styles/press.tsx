import { useReducedMotion } from '../hooks/useReducedMotion'
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import styled, { useTheme } from 'styled-components/native'

const Tint = styled.View<{ $dark?: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: ${(p) => (p.$dark ? 'rgba(0, 0, 0, 0.18)' : p.theme.accent)};
  opacity: ${(p) => (p.$dark ? 1 : 0.22)};
`

function rippleColor(accent: string, dark: boolean): string {
  if (dark) return 'rgba(0, 0, 0, 0.22)'
  if (accent.startsWith('#') && accent.length === 7) {
    return `${accent}59`
  }
  return 'rgba(255, 255, 255, 0.24)'
}

export type FeedbackPressableProps = PressableProps & {
  /** Dark wash for lime / light fills so the press flash stays visible. */
  darkRipple?: boolean
  noScale?: boolean
}

/**
 * Pressable with Android ripple, an iOS color wash, and a slight press-in scale.
 * Use as `styled(FeedbackPressable)` so chips and buttons share the same feel.
 */
export function FeedbackPressable({
  children,
  style,
  darkRipple,
  noScale,
  android_ripple,
  disabled,
  ...rest
}: FeedbackPressableProps) {
  const theme = useTheme()
  const reducedMotion = useReducedMotion()
  const ripple =
    android_ripple ??
    (disabled
      ? undefined
      : {
          color: rippleColor(theme.accent, Boolean(darkRipple)),
          foreground: true,
        })

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      android_ripple={ripple}
      style={(state) => {
        const extra: StyleProp<ViewStyle> = typeof style === 'function' ? style(state) : style
        return [
          { overflow: 'hidden' },
          extra,
          state.pressed && !disabled && !noScale && !reducedMotion ? { transform: [{ scale: 0.98 }] } : null,
        ]
      }}
    >
      {(state) => (
        <>
          {typeof children === 'function' ? children(state) : children}
          {state.pressed && !disabled && Platform.OS !== 'android' ? (
            <Tint $dark={darkRipple} pointerEvents="none" />
          ) : null}
        </>
      )}
    </Pressable>
  )
}
