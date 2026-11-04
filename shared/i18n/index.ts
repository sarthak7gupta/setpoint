/**
 * Shared UI copy: English, Spanish, French, Hindi.
 * Device language detection stays in platform adapters.
 */
import type { CourtSurface, Format, TimeOfDay } from '../engine/types'
import { en, type TxKey } from './en'
import { es } from './es'
import { fr } from './fr'
import { hi } from './hi'

export type { TxKey } from './en'
export type LocaleId = 'en' | 'es' | 'fr' | 'hi'
export type LocaleSetting = 'system' | LocaleId

const catalogs: Record<LocaleId, Record<TxKey, string>> = {
  en,
  es,
  fr,
  hi,
}

export const localeLabels: Record<LocaleSetting, string> = {
  system: 'System',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  hi: 'हिन्दी',
}

export function resolveLocale(
  setting: LocaleSetting | undefined,
  deviceLanguageCode = 'en',
): LocaleId {
  if (setting && setting !== 'system') return setting
  const code = deviceLanguageCode.toLowerCase().slice(0, 2)
  if (code === 'es' || code === 'fr' || code === 'hi') return code
  return 'en'
}

export function translate(
  locale: LocaleId,
  key: TxKey,
  vars?: Record<string, string | number>,
): string {
  let text = catalogs[locale][key] ?? en[key]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

export function formatTxKey(format: Format): TxKey {
  return format === 'doubles' ? 'format.doubles' : 'format.singles'
}

export function surfaceTxKey(surface: CourtSurface): TxKey {
  return `surface.${surface}` as TxKey
}

export function todTxKey(tod: TimeOfDay): TxKey {
  return `tod.${tod}` as TxKey
}

/** BCP-47 tags for SpeechSynthesis / recognition. */
export const speechLang: Record<LocaleId, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  hi: 'hi-IN',
}
