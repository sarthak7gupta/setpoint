import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../context/AppContext'
import { defaultSettings, type SettingsRecord } from '../db'
import { BootSplashGate } from './BootSplashGate'

vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  return {
    ...actual,
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
  }
})

import { getSettings } from '../db'

describe('BootSplashGate', () => {
  beforeEach(() => {
    vi.mocked(getSettings).mockResolvedValue({ ...defaultSettings } as SettingsRecord)
    document.getElementById('boot-splash')?.remove()
    const splash = document.createElement('div')
    splash.id = 'boot-splash'
    splash.setAttribute('aria-busy', 'true')
    splash.textContent = 'SetPoint'
    document.body.appendChild(splash)
  })

  it('keeps the splash until settings are ready, then fades it out', async () => {
    let resolveSettings!: (value: SettingsRecord) => void
    vi.mocked(getSettings).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSettings = resolve
        }),
    )

    render(
      <AppProvider>
        <BootSplashGate>
          <p>App ready</p>
        </BootSplashGate>
      </AppProvider>,
    )

    expect(screen.queryByText('App ready')).not.toBeInTheDocument()
    expect(document.getElementById('boot-splash')).toBeTruthy()

    resolveSettings({ ...defaultSettings })

    expect(await screen.findByText('App ready')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.getElementById('boot-splash')?.classList.contains('boot-splash--hide')).toBe(
        true,
      )
    })
  })
})
