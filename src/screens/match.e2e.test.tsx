/**
 * End-to-end: score a match in the live UI until it ends, then land on summary.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatchRecord } from '../db'
import { clearOverlay, freshSingles, reachSixAll, winGame, winPoint } from '../engine/testHelpers'
import { LiveMatch } from './LiveMatch'
import { MatchSummary } from './MatchSummary'

vi.mock('../context/AppContext', async () => {
  const { defaultSettings } = await import('../db')
  return {
    useApp: () => ({
      settings: {
        ...defaultSettings,
        voiceCalloutsEnabled: false,
        voiceCommandsEnabled: false,
      },
      theme: 'wimbledon' as const,
      locale: 'en' as const,
      setTheme: vi.fn(),
      updateSettings: vi.fn(),
      ready: true,
    }),
  }
})

vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  return {
    ...actual,
    getMatch: vi.fn(),
    saveMatch: vi.fn(),
  }
})

import { getMatch, saveMatch } from '../db'

function quietConfig() {
  return {
    bestOf: 1 as const,
    warmupEnabled: false,
    warmupDurationSeconds: 0,
    ballChangeEnabled: false,
    changeoverDurationSeconds: 0,
    breakDurationSeconds: 0,
  }
}

function recordFrom(state: ReturnType<typeof freshSingles>): MatchRecord {
  return {
    id: 'm-e2e',
    createdAt: 1,
    updatedAt: 1,
    config: state.config,
    metadata: state.metadata,
    state,
    playerNames: { p1: 'Alice', p2: 'Bob' },
  }
}

function renderMatch(initial: MatchRecord) {
  let stored = initial
  vi.mocked(getMatch).mockImplementation(async () => structuredClone(stored))
  vi.mocked(saveMatch).mockImplementation(async (next) => {
    stored = next
  })
  return render(
    <MemoryRouter initialEntries={['/match/m-e2e']}>
      <Routes>
        <Route path="/match/:matchId" element={<LiveMatch />} />
        <Route path="/match/:matchId/summary" element={<MatchSummary />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function skipBreakIfShown(user: ReturnType<typeof userEvent.setup>) {
  const skip = screen.queryByTestId('overlay-skip')
  if (skip) await user.click(skip)
}

describe('match e2e ending', () => {
  beforeEach(() => {
    vi.mocked(getMatch).mockReset()
    vi.mocked(saveMatch).mockReset()
  })

  it('plays a love set from 0-0 through to Match Summary', async () => {
    const user = userEvent.setup()
    renderMatch(recordFrom(freshSingles(quietConfig())))
    await waitFor(() => expect(screen.getByTestId('point-a')).toBeInTheDocument())

    for (let i = 0; i < 24; i++) {
      await skipBreakIfShown(user)
      await user.click(screen.getByTestId('point-a'))
    }

    await waitFor(() => expect(screen.getByText('Match Summary')).toBeInTheDocument())
    expect(screen.getByText(/Winner: Alice/)).toBeInTheDocument()
    expect(screen.getByText('6-0')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-recap')).toBeInTheDocument()
    expect(screen.getByTestId('rematch-btn')).toHaveAttribute('href', '/new?from=m-e2e')
  }, 15000)

  it('takes match point and opens Match Summary', async () => {
    const user = userEvent.setup()
    let state = freshSingles(quietConfig())
    for (let g = 0; g < 5; g++) {
      state = clearOverlay(winGame(state, 'a'))
    }
    for (let p = 0; p < 3; p++) state = winPoint(state, 'a')
    renderMatch(recordFrom(state))

    await waitFor(() => expect(screen.getByTestId('point-a')).toBeInTheDocument())
    expect(screen.getByTestId('points-a')).toHaveTextContent('40')
    await user.click(screen.getByTestId('point-a'))

    await waitFor(() => expect(screen.getByText('Match Summary')).toBeInTheDocument())
    expect(screen.getByText(/Winner: Alice/)).toBeInTheDocument()
    expect(screen.getByText('6-0')).toBeInTheDocument()
  })

  it('finishes a tiebreak on the last point and opens Match Summary', async () => {
    const user = userEvent.setup()
    let state = clearOverlay(reachSixAll(freshSingles(quietConfig())))
    for (let i = 0; i < 6; i++) state = winPoint(state, 'a')
    for (let i = 0; i < 5; i++) state = winPoint(state, 'b')
    renderMatch(recordFrom(state))

    await waitFor(() => expect(screen.getByTestId('point-a')).toBeInTheDocument())
    expect(screen.getByText(/Tiebreak/)).toBeInTheDocument()
    await user.click(screen.getByTestId('point-a'))

    await waitFor(() => expect(screen.getByText('Match Summary')).toBeInTheDocument())
    expect(screen.getByText(/Winner: Alice/)).toBeInTheDocument()
    expect(screen.getByText(/7-6/)).toBeInTheDocument()
  })
})
