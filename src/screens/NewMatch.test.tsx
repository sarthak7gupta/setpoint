import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatchRecord } from '../db'
import { freshSingles, winSetToLove } from '../engine/testHelpers'

vi.mock('../context/AppContext', async () => {
  const { defaultSettings } = await import('../db')
  return {
    useApp: () => ({
      settings: defaultSettings,
      theme: 'wimbledon',
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
    listPlayers: vi.fn(),
    listMatches: vi.fn(),
    getMatch: vi.fn(),
    upsertPlayer: vi.fn(),
  }
})

vi.mock('../hooks/useMatchController', () => ({
  startNewMatch: vi.fn(),
}))

import { listMatches, listPlayers } from '../db'
import { NewMatch } from './NewMatch'

function completed(args: {
  id: string
  playerIds: [string, string]
  names: [string, string]
  winner: 'a' | 'b'
  completedAt: number
}): MatchRecord {
  const state = winSetToLove(freshSingles({ bestOf: 1, playerIds: args.playerIds }), args.winner)
  return {
    id: args.id,
    createdAt: args.completedAt,
    updatedAt: args.completedAt,
    completedAt: args.completedAt,
    config: state.config,
    metadata: state.metadata,
    state,
    playerNames: { [args.playerIds[0]]: args.names[0], [args.playerIds[1]]: args.names[1] },
  }
}

function renderNewMatch() {
  return render(
    <MemoryRouter>
      <NewMatch />
    </MemoryRouter>,
  )
}

describe('NewMatch form and H2H', () => {
  beforeEach(() => {
    vi.mocked(listPlayers).mockResolvedValue([
      { id: 'p1', name: 'Alice', createdAt: 1 },
      { id: 'p2', name: 'Bob', createdAt: 1 },
      { id: 'p3', name: 'Cara', createdAt: 1 },
    ])
    vi.mocked(listMatches).mockResolvedValue([
      completed({
        id: 'm1',
        playerIds: ['p1', 'p2'],
        names: ['Alice', 'Bob'],
        winner: 'a',
        completedAt: 1,
      }),
      completed({
        id: 'm2',
        playerIds: ['p2', 'p1'],
        names: ['Bob', 'Alice'],
        winner: 'a',
        completedAt: 2,
      }),
      completed({
        id: 'm3',
        playerIds: ['p1', 'p3'],
        names: ['Alice', 'Cara'],
        winner: 'a',
        completedAt: 3,
      }),
    ])
  })

  it('shows last-5 form dots once an existing profile is selected', async () => {
    const user = userEvent.setup()
    renderNewMatch()
    await screen.findByTestId('player-name-0')
    await user.selectOptions(screen.getByLabelText('Player profile Player A'), 'p1')

    const dots = await screen.findByTestId('form-dots-0')
    expect(
      Array.from(dots.querySelectorAll('[data-result]'), (el) => el.getAttribute('data-result')),
    ).toEqual(['empty', 'empty', 'win', 'loss', 'win'])
  })

  it('shows head-to-head when both sides have met before', async () => {
    const user = userEvent.setup()
    renderNewMatch()
    await waitFor(() => expect(screen.getByTestId('player-name-0')).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText('Player profile Player A'), 'p1')
    await user.selectOptions(screen.getByLabelText('Player profile Player B'), 'p2')

    const h2h = await screen.findByTestId('head-to-head')
    expect(h2h).toHaveTextContent('Alice')
    expect(h2h).toHaveTextContent('Bob')
    expect(h2h).toHaveTextContent('1–1')
    expect(h2h).toHaveTextContent('2 meetings')
  })

  it('places reorder arrows beside the name input, not the label', async () => {
    renderNewMatch()
    const input = await screen.findByTestId('player-name-0')
    const up = screen.getByRole('button', { name: 'Move Player A up' })
    const down = screen.getByRole('button', { name: 'Move Player A down' })
    expect(input.parentElement).toContainElement(up)
    expect(input.parentElement).toContainElement(down)
    expect(input.closest('label')).toBeNull()
  })

  it('reorders players with the arrow buttons', async () => {
    const user = userEvent.setup()
    renderNewMatch()
    await waitFor(() => expect(screen.getByTestId('player-name-0')).toBeInTheDocument())
    await user.type(screen.getByTestId('player-name-0'), 'Alice')
    await user.type(screen.getByTestId('player-name-1'), 'Bob')
    await user.click(screen.getByRole('button', { name: 'Move Player A down' }))
    expect(screen.getByTestId('player-name-0')).toHaveValue('Bob')
    expect(screen.getByTestId('player-name-1')).toHaveValue('Alice')
  })

  it('hides head-to-head when the pair has never met', async () => {
    const user = userEvent.setup()
    renderNewMatch()
    await waitFor(() => expect(screen.getByTestId('player-name-0')).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText('Player profile Player A'), 'p2')
    await user.selectOptions(screen.getByLabelText('Player profile Player B'), 'p3')

    await waitFor(() => expect(screen.getByTestId('form-dots-0')).toBeInTheDocument())
    expect(screen.queryByTestId('head-to-head')).not.toBeInTheDocument()
  })

  it('pre-fills Player 1 / Player 2 and replaces them on focus typing', async () => {
    const user = userEvent.setup()
    renderNewMatch()
    const a = await screen.findByTestId('player-name-0')
    const b = screen.getByTestId('player-name-1')
    expect(a).toHaveValue('Player 1')
    expect(b).toHaveValue('Player 2')
    await user.click(a)
    await user.keyboard('Alice')
    expect(a).toHaveValue('Alice')
  })
})

it('typing a known name does not silently reuse an existing person', async () => {
  const user = userEvent.setup()
  renderNewMatch()
  const input = await screen.findByTestId('player-name-0')
  await user.clear(input)
  await user.type(input, 'Alice')
  expect(screen.getByLabelText('Player profile Player A')).toHaveValue('')
  expect(screen.queryByTestId('form-dots-0')).not.toBeInTheDocument()
})
