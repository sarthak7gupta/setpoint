import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from 'react'
import { createUseSettings } from '../../shared/hooks/useSettings'
import { defaultSettings, getSettings, type SettingsRecord, saveSettings } from '../db'
import { type LocaleId, resolveLocale } from '../i18n'
import { type DesignStyleId, getThemeVars, type ThemeId } from '../themes'

interface AppContextValue {
  settings: SettingsRecord
  theme: ThemeId
  designStyle: DesignStyleId
  locale: LocaleId
  setTheme: (theme: ThemeId) => Promise<void>
  setDesignStyle: (designStyle: DesignStyleId) => Promise<void>
  updateSettings: (partial: Partial<SettingsRecord>) => Promise<void>
  reloadSettings: () => Promise<void>
  settingsStatus: 'loading' | 'saved' | 'saving' | 'error'
  retrySettings: () => Promise<void>
  ready: boolean
}

const AppContext = createContext<AppContextValue | null>(null)

function applyThemeVars(theme: ThemeId, designStyle?: DesignStyleId) {
  const vars = getThemeVars(theme, designStyle ?? 'classic')
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.setAttribute('data-style', designStyle ?? 'classic')
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', vars['--purple'] ?? '#552D60')
}

const useSettings = createUseSettings(defaultSettings, getSettings, saveSettings)

export function AppProvider({ children }: { children: ReactNode }) {
  // Never gate the tree on IndexedDB — iOS standalone PWAs can delay or fail
  // IDB briefly, which previously rendered a permanent blank screen (`return null`).
  const { settings, ready, settingsStatus, updateSettings, reloadSettings, retrySettings } =
    useSettings()
  const setTheme = useCallback((theme: ThemeId) => updateSettings({ theme }), [updateSettings])
  const setDesignStyle = useCallback(
    (designStyle: DesignStyleId) => updateSettings({ designStyle }),
    [updateSettings],
  )
  useEffect(() => {
    applyThemeVars(settings.theme, settings.designStyle)
  }, [settings.theme, settings.designStyle])

  const value = useMemo<AppContextValue>(
    () => ({
      settings,
      theme: settings.theme,
      designStyle: settings.designStyle ?? 'classic',
      locale: resolveLocale(settings.locale),
      setTheme,
      setDesignStyle,
      updateSettings,
      reloadSettings,
      ready,
      settingsStatus,
      retrySettings,
    }),
    [
      settings,
      setTheme,
      setDesignStyle,
      updateSettings,
      reloadSettings,
      ready,
      settingsStatus,
      retrySettings,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
