import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatchRecord } from '../db'
import { freshSingles } from '../engine/testHelpers'
import { LiveMatch } from './LiveMatch'

vi.mock('../context/AppContext', async () => {
  const { defaultSettings } = await import('../db')
  const { useCallback, useState } = await import('react')
  return {
    useApp: () => {
      const [settings, setSettings] = useState({
        ...defaultSettings,
        voiceCalloutsEnabled: false,
        voiceCommandsEnabled: true,
      })
      const updateSettings = useCallback(async (partial: Partial<typeof settings>) => {
        setSettings((current) => ({ ...current, ...partial }))
      }, [])
      return {
        settings,
        theme: 'wimbledon' as const,
        locale: 'en' as const,
        setTheme: vi.fn(),
        updateSettings,
        ready: true,
      }
    },
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

function liveRecord(): MatchRecord {
  const state = freshSingles({ bestOf: 1 })
  return {
    id: 'm-live',
    createdAt: 1,
    updatedAt: 1,
    config: state.config,
    metadata: { date: '2026-09-01', courtSurface: 'hard' },
    state,
    playerNames: { p1: 'Alice', p2: 'Bob' },
  }
}

function renderLive() {
  vi.mocked(getMatch).mockResolvedValue(liveRecord())
  vi.mocked(saveMatch).mockResolvedValue(undefined)
  return render(
    <MemoryRouter initialEntries={['/match/m-live']}>
      <Routes>
        <Route path="/match/:matchId" element={<LiveMatch />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LiveMatch mid-match stats', () => {
  beforeEach(() => {
    vi.mocked(getMatch).mockReset()
    vi.mocked(saveMatch).mockReset()
  })

  it('offers winner and U. Error tags but not forced error', async () => {
    renderLive()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Winner' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'U. Error' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Point' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'FE' })).not.toBeInTheDocument()
  })

  it('toggles big screen mode from More', async () => {
    const user = userEvent.setup()
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    })
    vi.stubGlobal('screen', {
      orientation: { lock: vi.fn().mockResolvedValue(undefined), unlock: vi.fn() },
    })

    renderLive()
    await waitFor(() => expect(screen.getByTestId('more-actions')).toBeInTheDocument())
    expect(screen.getByTestId('tv-scoreboard')).toHaveAttribute('data-size', 'normal')

    await user.click(screen.getByTestId('more-actions'))
    await user.click(screen.getByTestId('toggle-big-screen'))
    expect(screen.getByTestId('tv-scoreboard')).toHaveAttribute('data-size', 'big')
    expect(screen.getByTestId('tv-scoreboard').closest('[data-big-screen]')).toHaveAttribute(
      'data-big-screen',
      'true',
    )
    expect(requestFullscreen).toHaveBeenCalled()

    await user.click(screen.getByTestId('more-actions'))
    expect(screen.getByTestId('toggle-big-screen')).toHaveTextContent('Exit big screen')
  })

  it('opens and closes stats from More', async () => {
    const user = userEvent.setup()
    renderLive()
    await waitFor(() => expect(screen.getByTestId('more-actions')).toBeInTheDocument())

    expect(screen.queryByTestId('open-live-stats')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('more-actions'))
    expect(screen.getByTestId('open-live-stats')).toBeInTheDocument()

    expect(screen.queryByTestId('live-stats')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('open-live-stats'))
    expect(screen.getByTestId('live-stats')).toBeInTheDocument()
    expect(screen.getByTestId('match-stats-panel')).toBeInTheDocument()
    expect(screen.getByTestId('stat-situation-bar')).toBeInTheDocument()

    await user.click(screen.getByTestId('close-live-stats'))
    expect(screen.queryByTestId('live-stats')).not.toBeInTheDocument()
  })

  it('opens and closes recap from More after Stats', async () => {
    const user = userEvent.setup()
    renderLive()
    await waitFor(() => expect(screen.getByTestId('more-actions')).toBeInTheDocument())

    await user.click(screen.getByTestId('more-actions'))
    expect(screen.getByTestId('open-live-stats')).toBeInTheDocument()
    expect(screen.getByTestId('open-live-recap')).toBeInTheDocument()
    const moreButtons = screen.getByTestId('open-live-stats').parentElement
    expect(moreButtons).toHaveStyle({ display: 'grid' })

    expect(screen.getByTestId('toggle-watch-share')).toHaveTextContent(/sharing on this network/i)
    await user.click(screen.getByTestId('open-live-recap'))
    expect(screen.getByTestId('live-recap')).toBeInTheDocument()

    await user.click(screen.getByTestId('close-live-recap'))
    expect(screen.queryByTestId('live-recap')).not.toBeInTheDocument()
  })

  it('edits timers and court details from More without changing scoring rules', async () => {
    const user = userEvent.setup()
    renderLive()
    await waitFor(() => expect(screen.getByTestId('more-actions')).toBeInTheDocument())

    await user.click(screen.getByTestId('more-actions'))
    await user.click(screen.getByTestId('open-live-settings'))
    expect(screen.getByTestId('live-settings')).toBeInTheDocument()
    expect(screen.getByTestId('live-break-sec')).toHaveValue(120)
    expect(screen.getByLabelText(/first ball change after/i)).toBeInTheDocument()
    await user.selectOptions(screen.getByTestId('live-ball-change'), 'off')
    expect(screen.queryByLabelText(/first ball change after/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/ball change seconds/i)).not.toBeInTheDocument()

    await user.clear(screen.getByTestId('live-break-sec'))
    await user.type(screen.getByTestId('live-break-sec'), '60')
    await user.selectOptions(screen.getByTestId('live-surface'), 'clay')
    await user.clear(screen.getByTestId('live-weather'))
    await user.type(screen.getByTestId('live-weather'), 'Windy')
    await user.click(screen.getByTestId('save-live-settings'))

    expect(screen.queryByTestId('live-settings')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(saveMatch).toHaveBeenCalled()
      const last = vi.mocked(saveMatch).mock.calls.at(-1)?.[0]
      expect(last?.config.breakDurationSeconds).toBe(60)
      expect(last?.config.bestOf).toBe(1)
      expect(last?.metadata.courtSurface).toBe('clay')
      expect(last?.metadata.weather).toBe('Windy')
      expect(last?.state.config.breakDurationSeconds).toBe(60)
      expect(last?.state.metadata.courtSurface).toBe('clay')
    })
  })

  it('awards a walkover from More', async () => {
    const user = userEvent.setup()
    renderLive()
    await waitFor(() => expect(screen.getByTestId('more-actions')).toBeInTheDocument())

    await user.click(screen.getByTestId('more-actions'))
    await user.click(screen.getByTestId('open-walkover'))
    expect(screen.getByTestId('walkover-pick')).toBeInTheDocument()
    await user.click(screen.getByTestId('walkover-pick-b'))
    expect(screen.getByTestId('walkover-confirm')).toBeInTheDocument()
    await user.click(screen.getByTestId('confirm-walkover'))

    await waitFor(() => {
      const last = vi.mocked(saveMatch).mock.calls.at(-1)?.[0]
      expect(last?.state.isComplete).toBe(true)
      expect(last?.state.winner).toBe('b')
      expect(last?.state.endedBy).toBe('walkover')
      expect(last?.completedAt).toEqual(expect.any(Number))
    })
  })

  it('opens stats from pause without resuming, and Escape closes stats only', async () => {
    const user = userEvent.setup()
    renderLive()
    await waitFor(() => expect(screen.getByTestId('pause-match')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mic' })).toBeInTheDocument()
    expect(screen.queryByText('Pause')).not.toBeInTheDocument()
    expect(screen.queryByText('Mic')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('pause-match'))
    expect(await screen.findByTestId('pause-overlay')).toBeInTheDocument()

    await user.click(screen.getByTestId('overlay-stats'))
    expect(screen.getByTestId('live-stats')).toBeInTheDocument()
    expect(screen.getByTestId('pause-overlay')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('live-stats')).not.toBeInTheDocument()
    expect(screen.getByTestId('pause-overlay')).toBeInTheDocument()
  })

  it('toggles score callouts from the mute chip', async () => {
    const user = userEvent.setup()
    renderLive()
    const mute = await screen.findByTestId('mute-callouts')
    expect(mute).toHaveAttribute('aria-pressed', 'true')
    expect(mute).toHaveAttribute('aria-label', 'Unmute callouts')

    await user.click(mute)
    expect(mute).toHaveAttribute('aria-pressed', 'false')
    expect(mute).toHaveAttribute('aria-label', 'Mute callouts')
  })
})

it('offers points-only scoring without shot tags and preserves undo', async () => {
  const user = userEvent.setup()
  renderLive()
  await screen.findByTestId('point-a')
  await user.click(screen.getByRole('button', { name: 'Points only' }))
  expect(screen.queryByRole('button', { name: 'Winner' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Show shot tags' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await user.click(screen.getByTestId('point-a'))
  expect(screen.getByTestId('points-a')).toHaveTextContent('15')
  await user.click(screen.getByRole('button', { name: 'Undo' }))
  expect(screen.getByTestId('points-a')).toHaveTextContent('0')
})
