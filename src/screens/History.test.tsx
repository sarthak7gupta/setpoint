import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../context/AppContext'
import type { MatchRecord } from '../db'
import { freshSingles, winSetToLove } from '../engine/testHelpers'
import { History } from './History'

vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  return {
    ...actual,
    listMatches: vi.fn(),
    deleteMatch: vi.fn(),
  }
})

import { deleteMatch, listMatches } from '../db'

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

function renderHistory(matches: MatchRecord[]) {
  vi.mocked(listMatches).mockResolvedValue(matches)
  vi.mocked(deleteMatch).mockResolvedValue(undefined)
  return render(
    <AppProvider>
      <MemoryRouter>
        <History />
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('History delete', () => {
  beforeEach(() => {
    vi.mocked(listMatches).mockReset()
    vi.mocked(deleteMatch).mockReset()
  })

  it('asks for confirmation before deleting', async () => {
    const user = userEvent.setup()
    renderHistory([sampleRecord()])
    await waitFor(() => expect(screen.getByTestId('delete-match')).toBeInTheDocument())

    await user.click(screen.getByTestId('delete-match'))
    expect(screen.getByTestId('delete-match-dialog')).toBeInTheDocument()
    expect(deleteMatch).not.toHaveBeenCalled()

    await user.click(screen.getByTestId('confirm-delete-match'))
    await waitFor(() => expect(deleteMatch).toHaveBeenCalledWith('m1'))
  })

  it('does not delete when the confirm popup is cancelled', async () => {
    const user = userEvent.setup()
    renderHistory([sampleRecord()])
    await waitFor(() => expect(screen.getByTestId('delete-match')).toBeInTheDocument())

    await user.click(screen.getByTestId('delete-match'))
    await user.click(screen.getByTestId('cancel-delete-match'))
    expect(screen.queryByTestId('delete-match-dialog')).not.toBeInTheDocument()
    expect(deleteMatch).not.toHaveBeenCalled()
  })
})
