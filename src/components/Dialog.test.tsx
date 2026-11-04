import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, it } from 'vitest'
import { Dialog } from './Dialog'

function Example() {
  const [open, setOpen] = useState(false),
    [nested, setNested] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <Dialog aria-label="Outer" onDismiss={() => setOpen(false)}>
          <button onClick={() => setOpen(false)}>Cancel</button>
          <button onClick={() => setNested(true)}>Details</button>
          {nested && (
            <Dialog aria-label="Inner" onDismiss={() => setNested(false)}>
              <button onClick={() => setNested(false)}>Done</button>
            </Dialog>
          )}
        </Dialog>
      )}
    </>
  )
}
it('contains keyboard focus and restores it through nested dialogs', async () => {
  const user = userEvent.setup()
  render(<Example />)
  await user.click(screen.getByText('Open'))
  expect(screen.getByText('Cancel')).toHaveFocus()
  await user.tab({ shift: true })
  expect(screen.getByText('Details')).toHaveFocus()
  await user.click(screen.getByText('Details'))
  expect(screen.getByText('Done')).toHaveFocus()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: 'Inner' })).not.toBeInTheDocument()
  expect(screen.getByText('Details')).toHaveFocus()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByText('Open')).toHaveFocus()
  expect(document.body.style.overflow).not.toBe('hidden')
})
