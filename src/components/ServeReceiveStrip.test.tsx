import { render as rtlRender, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { ServeReceiveStrip } from '../components/ServeReceiveStrip'
import { AppProvider } from '../context/AppContext'
import type { ServeInfo } from '../engine'

const serve: ServeInfo = {
  serverId: 'p1',
  receiverId: 'p2',
  receiverCourt: 'deuce',
  servingSide: 'a',
  receivingSide: 'b',
  isTiebreak: false,
  isSecondServe: false,
  nextServeLabel: 'p1 serves to p2',
}

const render = (element: ReactElement) => rtlRender(<AppProvider>{element}</AppProvider>)

describe('ServeReceiveStrip', () => {
  it('shows who is serving and receiving', () => {
    render(<ServeReceiveStrip serve={serve} nameOf={(id) => (id === 'p1' ? 'Federer' : 'Nadal')} />)
    expect(screen.getByTestId('serving-badge')).toHaveTextContent('Federer')
    expect(screen.getByTestId('receiving-badge')).toHaveTextContent('Nadal')
    expect(screen.getByTestId('receiving-badge')).toHaveTextContent('Deuce')
  })
})
