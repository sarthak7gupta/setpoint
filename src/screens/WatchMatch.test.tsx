import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../context/AppContext'
import { freshSingles } from '../engine/testHelpers'
import { buildWatchSnapshot } from '../watch'
import { WatchMatch } from './WatchMatch'

vi.mock('../watch/localIps', () => ({
  discoverLocalIpv4s: vi.fn(async () => ['192.168.1.10']),
  subnetBasesFromIps: () => ['192.168.1'],
}))

const snap = buildWatchSnapshot({
  matchId: 'm-watch',
  playerNames: { p1: 'Ada', p2: 'Bea' },
  state: freshSingles(),
  theme: 'wimbledon',
  updatedAt: 1,
})

describe('WatchMatch', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input)
        if (url.includes('192.168.1.4') && url.includes('47821')) {
          return new Response(JSON.stringify(snap), { status: 200 })
        }
        return new Response('', { status: 204 })
      }),
    )
  })

  it('scans the LAN and opens a found match read-only', async () => {
    const user = userEvent.setup()
    render(
      <AppProvider>
        <MemoryRouter initialEntries={['/watch']}>
          <Routes>
            <Route path="/watch" element={<WatchMatch />} />
            <Route path="/watch/live" element={<h1>Watching</h1>} />
          </Routes>
        </MemoryRouter>
      </AppProvider>,
    )
    expect(screen.getByText(/view only/i)).toBeInTheDocument()
    await user.click(screen.getByTestId('watch-scan'))
    await waitFor(() => expect(screen.getByTestId('watch-found')).toHaveTextContent('Ada vs Bea'))
    await user.click(screen.getByTestId('watch-found'))
    expect(screen.getByRole('heading', { name: 'Watching' })).toBeInTheDocument()
  })

  it('connects from a typed address', async () => {
    const user = userEvent.setup()
    render(
      <AppProvider>
        <MemoryRouter initialEntries={['/watch']}>
          <Routes>
            <Route path="/watch" element={<WatchMatch />} />
            <Route path="/watch/live" element={<h1>Watching</h1>} />
          </Routes>
        </MemoryRouter>
      </AppProvider>,
    )
    await user.type(screen.getByTestId('watch-address'), '192.168.1.4')
    await user.click(screen.getByTestId('watch-connect'))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Watching' })).toBeInTheDocument(),
    )
  })
})
