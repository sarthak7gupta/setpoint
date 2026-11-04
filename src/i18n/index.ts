import {
  type LocaleId,
  type LocaleSetting,
  resolveLocale as resolveLocaleShared,
} from '../../shared/i18n'

export type { LocaleId, LocaleSetting, TxKey } from '../../shared/i18n'
export {
  formatTxKey,
  localeLabels,
  speechLang,
  surfaceTxKey,
  todTxKey,
  translate,
} from '../../shared/i18n'

export function deviceLanguageCode(): string {
  if (typeof navigator === 'undefined') return 'en'
  const raw = navigator.languages?.[0] ?? navigator.language ?? 'en'
  return raw.toLowerCase().slice(0, 2)
}

export function resolveLocale(setting: LocaleSetting | undefined): LocaleId {
  return resolveLocaleShared(setting, deviceLanguageCode())
}
