import { Platform } from 'react-native'

/** Shared chrome levels used by Surface and Material elevation. */
export type SurfaceLevel = 'card' | 'elevated' | 'sheet' | 'overlay'

const iosRadius: Record<SurfaceLevel, number> = {
  card: 16,
  elevated: 18,
  sheet: 24,
  overlay: 22,
}

/** Material 3–ish corner radii (dp). */
const androidRadius: Record<SurfaceLevel, number> = {
  card: 16,
  elevated: 20,
  sheet: 28,
  overlay: 28,
}

const androidElevation: Record<SurfaceLevel, number> = {
  card: 1,
  elevated: 3,
  sheet: 6,
  overlay: 8,
}

export function surfaceRadius(level: SurfaceLevel = 'card'): number {
  return Platform.OS === 'android' ? androidRadius[level] : iosRadius[level]
}

export function materialElevation(level: SurfaceLevel = 'card'): number {
  return Platform.OS === 'android' ? androidElevation[level] : 0
}

/** Control / button corner radius. */
export const controlRadius = Platform.OS === 'android' ? 20 : 14

export const inputRadius = Platform.OS === 'android' ? 12 : 10

export const isAndroid = Platform.OS === 'android'
export const isIos = Platform.OS === 'ios'
