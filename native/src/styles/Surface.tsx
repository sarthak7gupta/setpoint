import { BlurView } from 'expo-blur'
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect'
import { useEffect, useState, type ReactNode } from 'react'
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native'
import { useTheme } from 'styled-components/native'
import { materialElevation, surfaceRadius, type SurfaceLevel } from './chrome'

function liquidGlassReady(): boolean {
  if (Platform.OS !== 'ios') return false
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable()
  } catch {
    return false
  }
}

function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    // iOS-only API; missing on web (and unused on Android solid surfaces).
    const query = AccessibilityInfo.isReduceTransparencyEnabled
    if (typeof query !== 'function') return

    let alive = true
    void query.call(AccessibilityInfo).then((value: boolean) => {
      if (alive) setReduce(value)
    })
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce)
    return () => {
      alive = false
      sub.remove()
    }
  }, [])
  return reduce
}

export type SurfaceProps = ViewProps & {
  children?: ReactNode
  level?: SurfaceLevel
  /** Tint / fill for Material and glass fallbacks. Defaults to theme.bgElevated. */
  tone?: string
  /** Soft hairline on Material cards (off by default for sheets). */
  outlined?: boolean
  /** iOS Liquid Glass interactive refraction (buttons / pressable chrome). */
  interactive?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * Platform surface chrome:
 * - iOS 26+: Liquid Glass (`expo-glass-effect`)
 * - older iOS: BlurView fallback (or solid if Reduce Transparency)
 * - Android: Material tonal surface + elevation
 */
export function Surface({
  children,
  level = 'card',
  tone,
  outlined,
  interactive,
  style,
  ...rest
}: SurfaceProps) {
  const theme = useTheme()
  const reduceTransparency = useReduceTransparency()
  const radius = surfaceRadius(level)
  const fill = tone ?? theme.bgElevated
  const showOutline = outlined ?? (level === 'card' || level === 'elevated')
  const base: ViewStyle = {
    borderRadius: radius,
    overflow: 'hidden',
  }

  if (Platform.OS === 'ios' && !reduceTransparency && liquidGlassReady()) {
    return (
      <GlassView
        {...rest}
        glassEffectStyle="regular"
        tintColor={fill}
        colorScheme="dark"
        isInteractive={interactive}
        style={[
          base,
          showOutline
            ? { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.line }
            : null,
          style,
        ]}
      >
        {children}
      </GlassView>
    )
  }

  if (Platform.OS === 'ios' && !reduceTransparency) {
    return (
      <View
        {...rest}
        style={[
          base,
          showOutline ? { borderWidth: 1, borderColor: theme.line } : null,
          style,
        ]}
      >
        <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFill} />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: `${fill}99`, pointerEvents: 'none' },
          ]}
        />
        {children}
      </View>
    )
  }

  // Android Material (and iOS Reduce Transparency / solid fallback)
  return (
    <View
      {...rest}
      style={[
        base,
        {
          backgroundColor: fill,
          elevation: materialElevation(level),
          borderWidth: showOutline ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
