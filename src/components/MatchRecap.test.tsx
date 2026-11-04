import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { playersOnSide } from '../engine'
import { freshDoubles, winPoint } from '../engine/testHelpers'
import { MatchRecap } from './MatchRecap'

const names: Record<string, string> = {
  a1: 'Alice',
  a2: 'Sarah',
  b1: 'Bobby',
  b2: 'Tommy',
}

function nameOf(id: string) {
  return names[id] ?? id
}

describe('MatchRecap', () => {
  it('bolds the server and first receiver, then the hovered point receiver', async () => {
    const user = userEvent.setup()
    let state = freshDoubles({ bestOf: 1 })
    state = winPoint(state, 'a')
    state = winPoint(state, 'a')
    state = winPoint(state, 'a')
    state = winPoint(state, 'a')
    const sideName = (side: 'a' | 'b') => playersOnSide(state.config, side).map(nameOf).join(' / ')

    render(<MatchRecap state={state} nameOf={nameOf} sideName={sideName} />)

    expect(screen.getByTestId('recap-name-0-0-a1')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('recap-name-0-0-a2')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('recap-name-0-0-b1')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('recap-name-0-0-b2')).toHaveAttribute('data-active', 'false')

    await user.hover(screen.getByTestId('recap-col-0-0-1'))
    expect(screen.getByTestId('recap-name-0-0-a1')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('recap-name-0-0-b1')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('recap-name-0-0-b2')).toHaveAttribute('data-active', 'true')

    await user.unhover(screen.getByTestId('recap-col-0-0-1'))
    expect(screen.getByTestId('recap-name-0-0-b1')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('recap-name-0-0-b2')).toHaveAttribute('data-active', 'false')
  })
})
