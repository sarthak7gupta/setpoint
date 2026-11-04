/**
 * Native UI copy: re-exports shared catalogs; device locale via expo-localization.
 */
import { getLocales } from 'expo-localization'
import {
  resolveLocale as resolveLocaleShared,
  type LocaleId,
  type LocaleSetting,
} from '../../../shared/i18n'

export type { TxKey, LocaleId, LocaleSetting } from '../../../shared/i18n'
export {
  formatTxKey,
  localeLabels,
  speechLang,
  surfaceTxKey,
  todTxKey,
  translate,
} from '../../../shared/i18n'

export function deviceLanguageCode(): string {
  return getLocales()[0]?.languageCode ?? 'en'
}

export function resolveLocale(setting: LocaleSetting | undefined): LocaleId {
  return resolveLocaleShared(setting, deviceLanguageCode())
}
