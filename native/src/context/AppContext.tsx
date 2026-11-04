import { createUseSettings } from '../../../shared/hooks/useSettings'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import { ThemeProvider } from 'styled-components/native'
import { defaultSettings, getSettings, type SettingsRecord, saveSettings } from '../db'
import { type LocaleId, resolveLocale } from '../i18n'
import { type ThemeId, themes } from '../themes'

interface AppContextValue {
  settings: SettingsRecord
  theme: ThemeId
  locale: LocaleId
  setTheme: (theme: ThemeId) => Promise<void>
  updateSettings: (partial: Partial<SettingsRecord>) => Promise<void>
  reloadSettings: () => Promise<void>
  settingsStatus: 'loading' | 'saved' | 'saving' | 'error'
  retrySettings: () => Promise<void>
  ready: boolean
}

const AppContext = createContext<AppContextValue | null>(null)

const useSettings = createUseSettings(defaultSettings, getSettings, saveSettings)

export function AppProvider({ children }: { children: ReactNode }) {
  const { settings, ready, settingsStatus, updateSettings, reloadSettings, retrySettings } = useSettings()
  const setTheme = useCallback((theme: ThemeId) => updateSettings({ theme }), [updateSettings])

  const value = useMemo<AppContextValue>(
    () => ({
      settings,
      theme: settings.theme,
      locale: resolveLocale(settings.locale),
      setTheme,
      updateSettings,
      reloadSettings,
      ready, settingsStatus, retrySettings,
    }),
    [settings, setTheme, updateSettings, reloadSettings, ready, settingsStatus, retrySettings],
  )

  return (
    <AppContext.Provider value={value}>
      <ThemeProvider theme={themes[settings.theme]}>{children}</ThemeProvider>
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
