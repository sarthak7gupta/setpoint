import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatchRecord } from '../db'
import { freshSingles, winSetToLove } from '../engine/testHelpers'
import { MatchSummary } from './MatchSummary'

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    settings: { theme: 'wimbledon', locale: 'system' },
    theme: 'wimbledon' as const,
    locale: 'en' as const,
    setTheme: vi.fn(),
    updateSettings: vi.fn(),
    ready: true,
  }),
}))

vi.mock('../db', () => ({
  getMatch: vi.fn(),
  saveMatch: vi.fn(),
}))

import { getMatch } from '../db'

function sampleRecord(): MatchRecord {
  const state = winSetToLove(freshSingles({ bestOf: 1 }), 'a')
  return {
    id: 'm1',
    createdAt: 1,
    updatedAt: 1,
    completedAt: 2,
    config: state.config,
    metadata: { date: '2026-09-01', courtSurface: 'hard' },
    state,
    playerNames: { p1: 'Alice', p2: 'Bob' },
  }
}

function renderSummary() {
  vi.mocked(getMatch).mockResolvedValue(sampleRecord())
  return render(
    <MemoryRouter initialEntries={['/match/m1/summary']}>
      <Routes>
        <Route path="/match/:matchId/summary" element={<MatchSummary />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MatchSummary recap', () => {
  beforeEach(() => {
    vi.mocked(getMatch).mockReset()
  })

  it('hides recap until Show recap is pressed', async () => {
    const user = userEvent.setup()
    renderSummary()
    await waitFor(() => expect(screen.getByTestId('toggle-recap')).toBeInTheDocument())

    expect(screen.queryByTestId('match-recap')).not.toBeInTheDocument()
    expect(screen.getByTestId('toggle-recap')).toHaveTextContent('Show recap')
    expect(screen.getByTestId('toggle-recap')).toHaveAttribute('aria-expanded', 'false')

    await user.click(screen.getByTestId('toggle-recap'))
    expect(screen.getByTestId('match-recap')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-recap')).toHaveTextContent('Hide recap')

    await user.click(screen.getByTestId('toggle-recap'))
    expect(screen.queryByTestId('match-recap')).not.toBeInTheDocument()
  })

  it('filters situational stats when a chip is pressed', async () => {
    const user = userEvent.setup()
    renderSummary()
    await waitFor(() => expect(screen.getByTestId('stat-situation-bar')).toBeInTheDocument())
    expect(screen.getByTestId('stat-situation-all')).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByTestId('stat-situation-pressure'))
    expect(screen.getByTestId('stat-situation-pressure')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Situational stats')).toBeInTheDocument()
  })

  it('links Rematch to New Match prefilled from this game', async () => {
    renderSummary()
    const rematch = await screen.findByTestId('rematch-btn')
    expect(rematch).toHaveAttribute('href', '/new?from=m1')
    expect(rematch).toHaveTextContent('Rematch')
  })
})
