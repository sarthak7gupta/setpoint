import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { buildBackup } from '../../shared/backup'
import { freshSingles } from '../../shared/engine/testHelpers'
import { AppProvider } from '../context/AppContext'
import { BackupExportDialog } from './BackupExportDialog'

it('preserves deliberate exclusions across filters and blocks an invalid date range', async () => {
  const state = freshSingles(),
    onConfirm = vi.fn()
  const match = (id: string, date: string) => ({
    id,
    createdAt: 1,
    updatedAt: 1,
    config: state.config,
    metadata: { ...state.metadata, date },
    state: { ...state, metadata: { ...state.metadata, date } },
    playerNames: { p1: 'A', p2: 'B' },
  })
  const backup = buildBackup({
    players: [],
    matches: [match('a', '2026-09-01'), match('b', '2026-09-02')],
    settings: {},
  })
  const user = userEvent.setup()
  render(
    <AppProvider>
      <BackupExportDialog backup={backup} busy={false} onCancel={() => {}} onConfirm={onConfirm} />
    </AppProvider>,
  )
  await user.click(within(screen.getByTestId('export-match-a')).getByRole('checkbox'))
  fireEvent.change(screen.getByTestId('export-filter-from'), { target: { value: '2026-09-02' } })
  fireEvent.change(screen.getByTestId('export-filter-from'), { target: { value: '' } })
  expect(within(screen.getByTestId('export-match-a')).getByRole('checkbox')).not.toBeChecked()
  expect(screen.getByRole('status')).toHaveTextContent('1 selected of 2')
  fireEvent.change(screen.getByTestId('export-filter-from'), { target: { value: '2026-09-03' } })
  fireEvent.change(screen.getByTestId('export-filter-to'), { target: { value: '2026-09-01' } })
  expect(screen.getByTestId('confirm-export-backup')).toBeDisabled()
  expect(screen.getByRole('alert')).toHaveTextContent('Enter valid dates')
})
