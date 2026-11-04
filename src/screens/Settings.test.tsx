import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../context/AppContext'
import { defaultSettings, type SettingsRecord } from '../db'
import { BACKUP_KIND, BACKUP_VERSION, type SetPointBackup, stringifyBackup } from '../utils/backup'
import { Settings } from './Settings'

vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  return {
    ...actual,
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    createBackup: vi.fn(),
    applyBackup: vi.fn(),
  }
})

import type { MatchRecord } from '../db'
import { applyBackup, createBackup, getSettings, saveSettings } from '../db'
import { freshSingles } from '../engine/testHelpers'

function sampleBackup(overrides: Partial<SetPointBackup> = {}): SetPointBackup {
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: 1,
    players: [],
    matches: [],
    settings: {},
    ...overrides,
  }
}

function testMatch(args: { id: string; date: string; names: Record<string, string> }): MatchRecord {
  const state = freshSingles()
  const metadata = { ...state.metadata, date: args.date }
  return {
    id: args.id,
    createdAt: 1,
    updatedAt: 1,
    config: state.config,
    metadata,
    state: { ...state, metadata },
    playerNames: args.names,
  }
}

function renderSettings() {
  return render(
    <AppProvider>
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('Settings backup', () => {
  let stored: SettingsRecord

  beforeEach(() => {
    stored = { ...defaultSettings }
    vi.mocked(getSettings).mockImplementation(async () => stored)
    vi.mocked(saveSettings).mockImplementation(async (partial) => {
      stored = { ...stored, ...partial, id: 'settings' }
      return stored
    })
    vi.mocked(createBackup).mockReset()
    vi.mocked(applyBackup).mockReset()
  })

  it('downloads a filtered backup file', async () => {
    const user = userEvent.setup()
    const alice = testMatch({
      id: 'm1',
      date: '2026-09-01',
      names: { p1: 'Alice', p2: 'Bob' },
    })
    const ada = testMatch({
      id: 'm2',
      date: '2026-08-01',
      names: { p1: 'Ada', p2: 'Bea' },
    })
    const backup = sampleBackup({
      exportedAt: new Date(2026, 8, 5, 15).getTime(),
      players: [
        { id: 'p1', name: 'Alice', createdAt: 1 },
        { id: 'p2', name: 'Bob', createdAt: 2 },
        { id: 'p3', name: 'Ada', createdAt: 3 },
        { id: 'p4', name: 'Bea', createdAt: 4 },
      ],
      matches: [alice, ada],
      settings: { theme: 'wimbledon' },
    })
    vi.mocked(createBackup).mockResolvedValue(backup)
    const createObjectURL = vi.fn(() => 'blob:backup')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    renderSettings()
    await user.click(screen.getByTestId('export-backup'))
    expect(await screen.findByTestId('export-backup-dialog')).toBeInTheDocument()
    await user.click(screen.getByTestId('export-match-m2'))
    await user.click(screen.getByTestId('export-include-settings'))
    await user.click(screen.getByTestId('confirm-export-backup'))

    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(createObjectURL).toHaveBeenCalled()
    const blob = (createObjectURL.mock.calls as unknown as [Blob][])[0]?.[0]
    const json = JSON.parse(await blob.text()) as SetPointBackup
    expect(json.matches.map((match) => match.id)).toEqual(['m1'])
    expect(json.settings).toEqual({})
    expect(screen.getByTestId('backup-status')).toHaveTextContent(/ready to share/i)

    click.mockRestore()
    vi.unstubAllGlobals()
  })

  it('does not export when the confirm popup is cancelled', async () => {
    const user = userEvent.setup()
    vi.mocked(createBackup).mockResolvedValue(sampleBackup())
    const createObjectURL = vi.fn(() => 'blob:backup')
    vi.stubGlobal('URL', { ...URL, createObjectURL })

    renderSettings()
    await user.click(screen.getByTestId('export-backup'))
    await user.click(screen.getByTestId('cancel-export-backup'))
    expect(screen.queryByTestId('export-backup-dialog')).not.toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('imports everything in the selected file', async () => {
    const user = userEvent.setup()
    const alice = testMatch({
      id: 'm1',
      date: '2026-09-01',
      names: { p1: 'Alice', p2: 'Bob' },
    })
    const ada = testMatch({
      id: 'm2',
      date: '2026-08-01',
      names: { p1: 'Ada', p2: 'Bea' },
    })
    const backup = sampleBackup({
      players: [
        { id: 'p1', name: 'Alice', createdAt: 1 },
        { id: 'p2', name: 'Bob', createdAt: 2 },
      ],
      matches: [alice, ada],
      settings: { theme: 'usOpen' },
    })
    vi.mocked(applyBackup).mockResolvedValue({
      players: backup.players,
      matches: backup.matches,
      settings: backup.settings,
      summary: { players: 2, matches: 2, matchesAdded: 2, matchesUpdated: 0 },
    })
    stored = { ...stored, theme: 'usOpen' }
    vi.mocked(getSettings).mockImplementation(async () => stored)

    renderSettings()
    const file = new File([stringifyBackup(backup)], 'setpoint.json', { type: 'application/json' })
    await user.upload(screen.getByTestId('import-backup-file'), file)

    await waitFor(() => expect(applyBackup).toHaveBeenCalled())
    expect(screen.queryByTestId('export-backup-dialog')).not.toBeInTheDocument()
    const sent = vi.mocked(applyBackup).mock.calls[0]?.[0]
    expect(sent?.matches.map((match) => match.id)).toEqual(['m1', 'm2'])
    expect(sent?.settings).toEqual({ theme: 'usOpen' })
    expect(screen.getByTestId('backup-status')).toHaveTextContent(
      'Imported 2 matches and 2 players.',
    )
  })

  it('shows an error for a file that is not a SetPoint backup', async () => {
    const user = userEvent.setup()
    renderSettings()
    const file = new File(['{"hello":1}'], 'notes.json', { type: 'application/json' })
    await user.upload(screen.getByTestId('import-backup-file'), file)
    expect(await screen.findByTestId('backup-status')).toHaveTextContent(/could not read/i)
    expect(applyBackup).not.toHaveBeenCalled()
  })

  it('filters the export list by player and date', async () => {
    const user = userEvent.setup()
    const alice = testMatch({
      id: 'm1',
      date: '2026-09-01',
      names: { p1: 'Alice', p2: 'Bob' },
    })
    const ada = testMatch({
      id: 'm2',
      date: '2026-08-01',
      names: { p1: 'Ada', p2: 'Bea' },
    })
    vi.mocked(createBackup).mockResolvedValue(sampleBackup({ matches: [alice, ada] }))

    renderSettings()
    await user.click(screen.getByTestId('export-backup'))
    await screen.findByTestId('export-backup-dialog')

    await user.click(screen.getByTestId('export-player-Alice'))
    await waitFor(() => {
      expect(screen.getByTestId('export-match-m1')).toBeInTheDocument()
      expect(screen.queryByTestId('export-match-m2')).not.toBeInTheDocument()
    })

    await user.click(screen.getByTestId('export-player-Ada'))
    await waitFor(() => {
      expect(screen.getByTestId('export-match-m1')).toBeInTheDocument()
      expect(screen.getByTestId('export-match-m2')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('export-clear-players'))
    await user.clear(screen.getByTestId('export-filter-from'))
    await user.type(screen.getByTestId('export-filter-from'), '2026-09-01')
    await user.type(screen.getByTestId('export-filter-to'), '2026-09-01')
    await waitFor(() => {
      expect(screen.getByTestId('export-match-m1')).toBeInTheDocument()
      expect(screen.queryByTestId('export-match-m2')).not.toBeInTheDocument()
    })
  })
})

describe('Settings match defaults', () => {
  let stored: SettingsRecord

  beforeEach(() => {
    stored = { ...defaultSettings }
    vi.mocked(getSettings).mockImplementation(async () => stored)
    vi.mocked(saveSettings).mockImplementation(async (partial) => {
      stored = { ...stored, ...partial, id: 'settings' }
      return stored
    })
  })

  it('hides ball-change extras when reminders are off', async () => {
    const user = userEvent.setup()
    renderSettings()
    expect(await screen.findByLabelText(/ball change reminders/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/first ball change after/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/then every/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/ball change seconds/i)).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/ball change reminders/i), 'on')
    expect(screen.getByLabelText(/first ball change after/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ball change seconds/i)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/ball change reminders/i), 'off')
    expect(screen.queryByLabelText(/first ball change after/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/then every/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/ball change seconds/i)).not.toBeInTheDocument()
  })
})
