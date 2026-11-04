import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../context/AppContext'
import { freshSingles, winPoint } from '../engine/testHelpers'
import { buildWatchSnapshot } from '../watch'
import { WatchLive } from './WatchLive'

const snapshot = buildWatchSnapshot({
  matchId: 'm-watch',
  playerNames: { p1: 'Ada', p2: 'Bea' },
  state: winPoint(freshSingles(), 'a'),
  theme: 'wimbledon',
  updatedAt: 2,
})

vi.mock('../hooks/useWatchClient', () => ({
  useWatchClient: () => ({ snapshot, status: 'live' as const }),
}))

describe('WatchLive', () => {
  it('shows the board without scoring controls', async () => {
    const user = userEvent.setup()
    render(
      <AppProvider>
        <MemoryRouter
          initialEntries={['/watch/live?src=http://192.168.1.4:47821/__setpoint/watch']}
        >
          <Routes>
            <Route path="/watch/live" element={<WatchLive />} />
          </Routes>
        </MemoryRouter>
      </AppProvider>,
    )
    expect(screen.getByTestId('watch-live')).toBeInTheDocument()
    expect(screen.getByTestId('watch-banner')).toHaveTextContent(/view only/i)
    expect(screen.getByTestId('tv-scoreboard')).toBeInTheDocument()
    expect(screen.queryByTestId('point-a')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()

    await user.click(screen.getByTestId('watch-more'))
    expect(screen.getByTestId('watch-open-stats')).toBeInTheDocument()
    expect(screen.getByTestId('watch-open-recap')).toBeInTheDocument()
    expect(screen.queryByTestId('open-live-settings')).not.toBeInTheDocument()
  })
})
