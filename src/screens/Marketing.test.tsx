import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../context/AppContext'
import { defaultSettings, type SettingsRecord } from '../db'
import { Marketing } from './Marketing'

vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  return {
    ...actual,
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
  }
})

import { getSettings, saveSettings } from '../db'

function renderAt(path: string) {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<Marketing />} />
          <Route path="/app" element={<h1>Scorer home</h1>} />
          <Route path="/new" element={<h1>New match</h1>} />
        </Routes>
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('Marketing landing', () => {
  let stored: SettingsRecord

  beforeEach(() => {
    stored = { ...defaultSettings }
    vi.mocked(getSettings).mockImplementation(async () => stored)
    vi.mocked(saveSettings).mockImplementation(async (partial) => {
      stored = { ...stored, ...partial, id: 'settings' }
      return stored
    })
  })

  it('renders the product page at /', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: /keep score like a slam/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open the scorer/i })).toHaveAttribute('href', '/app')
    expect(screen.getByRole('link', { name: /start a match/i })).toHaveAttribute('href', '/new')
    expect(screen.getByText('3 Championship Points')).toBeInTheDocument()
    expect(screen.getByText('Sinner')).toBeInTheDocument()
    expect(screen.getByText('Alcaraz')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('40')).toHaveAttribute('data-last-point', 'true')
    expect(screen.getByText(/phone across the net/i)).toBeInTheDocument()
    expect(screen.getByText(/watch a match/i)).toBeInTheDocument()
  })

  it('sends older PWA installs (?source=pwa) into the scorer', () => {
    renderAt('/?source=pwa')
    expect(screen.getByRole('heading', { name: 'Scorer home' })).toBeInTheDocument()
  })

  it('opens the scorer from the nav', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('link', { name: 'Open app' }))
    expect(screen.getByRole('heading', { name: 'Scorer home' })).toBeInTheDocument()
  })

  it('lets visitors pick a slam theme and persists it for the app', async () => {
    const user = userEvent.setup()
    renderAt('/')

    const wimbledon = screen.getByRole('button', { name: /wimbledon theme/i })
    const australian = screen.getByRole('button', { name: /australian open theme/i })
    expect(wimbledon).toHaveAttribute('aria-pressed', 'true')
    expect(australian).toHaveAttribute('aria-pressed', 'false')

    await user.click(australian)

    await waitFor(() => {
      expect(australian).toHaveAttribute('aria-pressed', 'true')
    })
    expect(wimbledon).toHaveAttribute('aria-pressed', 'false')
    expect(document.documentElement.getAttribute('data-theme')).toBe('australianOpen')
    expect(stored.theme).toBe('australianOpen')
    expect(screen.getByTestId('landing-scoreboard')).toHaveAttribute(
      'data-board-theme',
      'australianOpen',
    )
    expect(screen.getByText('▶')).toBeInTheDocument()
  })
})
