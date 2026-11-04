import { ensureContrast } from '../../../shared/utils/contrast'
export type ThemeId = 'wimbledon' | 'rolandGarros' | 'usOpen' | 'australianOpen'

/** Shared tennis-ball accent used across slam themes. */
export const BALL_GREEN = '#CCFF00'

export const themeLabels: Record<ThemeId, string> = {
  wimbledon: 'Wimbledon',
  australianOpen: 'Australian Open',
  rolandGarros: 'Roland Garros',
  usOpen: 'US Open',
}

/** Display order for theme pickers: Wimbledon → AO → RG → USO */
export const themeOrder: ThemeId[] = ['wimbledon', 'australianOpen', 'rolandGarros', 'usOpen']

export interface TvTheme {
  nameBg: string
  setBg: string
  setCurrent: string
  pointsBg: string
  pointsText: string
  won: string
  serveAccent: string
  receiveAccent: string
  borderColor: string
  borderWidth: number
  borderRadius: number
}

export interface AppTheme {
  id: ThemeId
  bgDeep: string
  bgMid: string
  bgElevated: string
  purple: string
  purpleBright: string
  accent: string
  accentSoft: string
  green: string
  greenBright: string
  text: string
  textMuted: string
  line: string
  danger: string
  warning: string
  serve: string
  receive: string
  gradient: [string, string, ...string[]]
  tv: TvTheme
  fontUi: string
  fontUiMedium: string
  fontUiSemiBold: string
  fontUiBold: string
  fontDisplay: string
}

const fonts = {
  fontUi: 'DMSans_400Regular',
  fontUiMedium: 'DMSans_500Medium',
  fontUiSemiBold: 'DMSans_600SemiBold',
  fontUiBold: 'DMSans_700Bold',
  fontDisplay: 'BebasNeue_400Regular',
} as const

export const themes: Record<ThemeId, AppTheme> = {
  wimbledon: {
    id: 'wimbledon',
    bgDeep: '#0a0610',
    bgMid: '#161022',
    bgElevated: '#241530',
    purple: '#552D60',
    purpleBright: '#7a4588',
    accent: BALL_GREEN,
    accentSoft: '#e6ff80',
    green: '#228B22',
    greenBright: '#3cb03c',
    text: '#f4f7ef',
    textMuted: '#b7c4a8',
    line: 'rgba(204, 255, 0, 0.28)',
    danger: '#e85d6a',
    warning: '#f0a04b',
    serve: BALL_GREEN,
    receive: '#9ad0ff',
    gradient: ['#0a0610', '#161022', '#552D60', '#3a1f48', '#1a3a1a', '#228B22'],
    ...fonts,
    tv: {
      nameBg: '#228b22',
      setBg: '#552d60',
      setCurrent: '#1a6b1a',
      pointsBg: '#552d60',
      pointsText: '#ffffff',
      won: '#ccff00',
      serveAccent: '#ccff00',
      receiveAccent: '#9ad0ff',
      borderColor: '#ffffff',
      borderWidth: 2,
      borderRadius: 10,
    },
  },
  australianOpen: {
    id: 'australianOpen',
    bgDeep: '#020e0c',
    bgMid: '#0a2418',
    bgElevated: '#0d2e20',
    purple: '#0F4D2A',
    purpleBright: '#1a6b3c',
    accent: '#1E8FD5',
    accentSoft: '#7ec8ff',
    green: '#0F4D2A',
    greenBright: '#1e7a45',
    text: '#eef9ff',
    textMuted: '#9ec4b8',
    line: 'rgba(30, 143, 213, 0.35)',
    danger: '#ff5c7a',
    warning: '#f0a04b',
    serve: BALL_GREEN,
    receive: '#7ec8ff',
    gradient: ['#020e0c', '#0F4D2A', '#0a3828', '#0a4558', '#1E8FD5', '#3aa4e6'],
    ...fonts,
    tv: {
      nameBg: '#0f4d2a',
      setBg: '#0a2a1a',
      setCurrent: '#1e8fd5',
      pointsBg: '#ffffff',
      pointsText: '#0a2418',
      won: '#7ec8ff',
      serveAccent: '#ccff00',
      receiveAccent: '#7ec8ff',
      borderColor: '#1e8fd5',
      borderWidth: 1.5,
      borderRadius: 10,
    },
  },
  rolandGarros: {
    id: 'rolandGarros',
    bgDeep: '#08110c',
    bgMid: '#152218',
    bgElevated: '#1e2e22',
    purple: '#1A4D2E',
    purpleBright: '#2a6b42',
    accent: '#B06500',
    accentSoft: '#e8a45a',
    green: '#1A4D2E',
    greenBright: '#2f7a4a',
    text: '#faf6f0',
    textMuted: '#c9b8a4',
    line: 'rgba(176, 101, 0, 0.4)',
    danger: '#d45656',
    warning: '#e89b3c',
    serve: BALL_GREEN,
    receive: '#9ec5ff',
    gradient: ['#08110c', '#1A4D2E', '#2a3d22', '#5a3a14', '#B06500', '#c87820'],
    ...fonts,
    tv: {
      nameBg: '#1a4d2e',
      setBg: '#143d24',
      setCurrent: '#3d8f5a',
      pointsBg: '#ffffff',
      pointsText: '#1a4d2e',
      won: '#e8a45a',
      serveAccent: '#ccff00',
      receiveAccent: '#e8a45a',
      borderColor: 'rgba(176, 101, 0, 0.65)',
      borderWidth: 1,
      borderRadius: 2,
    },
  },
  usOpen: {
    id: 'usOpen',
    bgDeep: '#040e1a',
    bgMid: '#0a2238',
    bgElevated: '#0f2c44',
    purple: '#1E8FD5',
    purpleBright: '#3aa4e6',
    accent: BALL_GREEN,
    accentSoft: '#e6ff80',
    green: '#6C935C',
    greenBright: '#87b074',
    text: '#f0f7ff',
    textMuted: '#a8c0d4',
    line: 'rgba(30, 143, 213, 0.4)',
    danger: '#ff6b6b',
    warning: '#f0a04b',
    serve: BALL_GREEN,
    receive: '#7ec8ff',
    gradient: ['#040e1a', '#0a2238', '#12507a', '#1E8FD5', '#3d7a55', '#6C935C'],
    ...fonts,
    tv: {
      nameBg: '#0a1c30',
      setBg: '#081828',
      setCurrent: '#0f2c44',
      pointsBg: '#ffffff',
      pointsText: '#061525',
      won: '#ccff00',
      serveAccent: '#ccff00',
      receiveAccent: '#1e8fd5',
      borderColor: 'rgba(30, 143, 213, 0.7)',
      borderWidth: 1.5,
      borderRadius: 10,
    },
  },
}

for (const theme of Object.values(themes)) theme.textMuted = ensureContrast(theme.textMuted,[theme.bgDeep,theme.bgMid,theme.bgElevated])

export function serveGlyph(theme: ThemeId): string {
  switch (theme) {
    case 'wimbledon':
      return '▸'
    case 'rolandGarros':
      return '//'
    case 'usOpen':
      return '●'
    case 'australianOpen':
      return '▶'
    default:
      return '●'
  }
}
