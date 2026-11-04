import type { CourtSurface, Format, ThemeId } from './engine/types'
import type { LocaleSetting } from './i18n'

export interface CommonSettings {
  id: 'settings'
  theme: ThemeId
  defaultFormat: Format
  defaultBestOf: 1 | 3 | 5
  defaultTiebreakPoints: number
  defaultFinalSetTiebreak: boolean
  defaultFinalSetTiebreakPoints: number
  defaultNoAdScoring: boolean
  defaultBreakSeconds: number
  defaultChangeoverSeconds: number
  defaultBallChangeEnabled: boolean
  defaultBallChangeFirstGames: number
  defaultBallChangeEveryGames: number
  defaultBallChangeSeconds: number
  defaultWarmupEnabled: boolean
  defaultWarmupSeconds: number
  defaultCourtSurface: CourtSurface
  defaultWeather: string
  locale: LocaleSetting
  voiceCalloutsEnabled: boolean
  voiceCommandsEnabled: boolean
  hasCompletedTour: boolean
  quietScoring: boolean
}

export const commonSettings: CommonSettings = {
  id: 'settings',
  theme: 'wimbledon',
  defaultFormat: 'singles',
  defaultBestOf: 3,
  defaultTiebreakPoints: 7,
  defaultFinalSetTiebreak: true,
  defaultFinalSetTiebreakPoints: 10,
  defaultNoAdScoring: false,
  defaultBreakSeconds: 120,
  defaultChangeoverSeconds: 90,
  defaultBallChangeEnabled: false,
  defaultBallChangeFirstGames: 7,
  defaultBallChangeEveryGames: 9,
  defaultBallChangeSeconds: 90,
  defaultWarmupEnabled: true,
  defaultWarmupSeconds: 300,
  defaultCourtSurface: 'hard',
  defaultWeather: '',
  locale: 'system',
  voiceCalloutsEnabled: true,
  voiceCommandsEnabled: true,
  hasCompletedTour: true,
  quietScoring: false,
}

export function validSetting(key: string, value: unknown, fallback: unknown): boolean {
  if (typeof value !== typeof fallback) return false
  if (typeof value === 'number') {
    const min = /TiebreakPoints|FirstGames|EveryGames/.test(key) ? 1 : 0
    return (
      Number.isSafeInteger(value) &&
      value >= min &&
      (key !== 'defaultBestOf' || [1, 3, 5].includes(value))
    )
  }
  const choices: Record<string, string[]> = {
    theme: ['wimbledon', 'rolandGarros', 'usOpen', 'australianOpen'],
    defaultFormat: ['singles', 'doubles'],
    locale: ['system', 'en', 'es', 'fr', 'hi'],
    defaultCourtSurface: ['grass', 'clay', 'hard', 'carpet', 'indoor', 'concrete'],
    designStyle: ['classic', 'hawkEye', 'minimal', 'chrono', 'chalkclub', 'clipboard'],
  }
  return !choices[key] || choices[key].includes(String(value))
}

/** Each adapter gets one queue: reads, migrations and patches cannot interleave. */
export function createSettingsStore<T extends CommonSettings>(
  defaults: T,
  read: () => Promise<unknown>,
  write: (settings: T) => Promise<unknown>,
) {
  let tail: Promise<unknown> = Promise.resolve()
  const enqueue = <R>(task: () => Promise<R>): Promise<R> => {
    const run = tail.then(task, task)
    tail = run.catch(() => {})
    return run
  }
  const normalize = (raw: unknown): T => {
    const next = { ...defaults }
    if (raw && typeof raw === 'object') {
      for (const key of Object.keys(defaults) as (keyof T)[]) {
        const value = (raw as T)[key]
        if (validSetting(String(key), value, defaults[key])) next[key] = value
      }
    } else next.hasCompletedTour = false
    next.id = 'settings'
    return next
  }
  const load = async () => {
    const raw = await read()
    const settings = normalize(raw)
    if (JSON.stringify(raw) !== JSON.stringify(settings)) await write(settings)
    return settings
  }
  return {
    getSettings: () => enqueue(load),
    withSettings: <R>(task: (settings: T) => Promise<R>) => enqueue(async () => task(await load())),
    saveSettings: (partial: Partial<T>) =>
      enqueue(async () => {
        const current = await load()
        for (const [key, value] of Object.entries(partial)) {
          if (key in defaults && !validSetting(key, value, defaults[key as keyof T]))
            throw new Error(`Invalid setting: ${key}`)
        }
        const next = normalize({ ...current, ...partial })
        await write(next)
        return next
      }),
  }
}
