import { render as rtlRender, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../context/AppContext'
import type { MatchConfig, MatchMetadata, MatchState } from '../engine'
import { createMatch, getServeInfo } from '../engine'
import { clearOverlay, winGame, winPoint } from '../engine/testHelpers'
import { TvScoreboard } from './TvScoreboard'

const meta: MatchMetadata = { date: '2026-08-31' }
const config: MatchConfig = {
  format: 'singles',
  bestOf: 3,
  tiebreakPoints: 7,
  finalSetTiebreak: true,
  finalSetTiebreakPoints: 10,
  breakDurationSeconds: 90,
  changeoverDurationSeconds: 60,
  playerIds: ['p1', 'p2'],
  firstServerId: 'p1',
}

const render = (element: ReactElement) => rtlRender(<AppProvider>{element}</AppProvider>)

describe('TvScoreboard', () => {
  it('highlights server and receiver roles', () => {
    const state = createMatch(config, meta)
    const serve = getServeInfo(state)
    render(
      <TvScoreboard
        state={state}
        serve={serve}
        nameOf={(id) => (id === 'p1' ? 'Federer' : 'Nadal')}
        theme="wimbledon"
      />,
    )
    expect(screen.getByTestId('tv-scoreboard')).toBeInTheDocument()
    expect(screen.getByText(/Serving: Federer/)).toBeInTheDocument()
    expect(screen.queryByText('Serve')).not.toBeInTheDocument()
    expect(screen.queryByText('Recv')).not.toBeInTheDocument()
    expect(screen.getByTestId('points-a')).toHaveTextContent('0')
    expect(screen.getByTestId('points-b')).toHaveTextContent('0')
  })

  it('shows loser TB points as superscript on the 6', () => {
    const base = createMatch(config, meta)
    const state: MatchState = {
      ...base,
      sets: [
        {
          gamesA: 7,
          gamesB: 6,
          isTiebreak: true,
          tiebreakPointsA: 7,
          tiebreakPointsB: 5,
          completed: true,
          winner: 'a',
        },
        {
          gamesA: 0,
          gamesB: 0,
          isTiebreak: false,
          tiebreakPointsA: 0,
          tiebreakPointsB: 0,
          completed: false,
        },
      ],
    }
    const serve = getServeInfo(state)
    render(
      <TvScoreboard
        state={state}
        serve={serve}
        nameOf={(id) => (id === 'p1' ? 'Federer' : 'Nadal')}
        theme="wimbledon"
      />,
    )
    expect(screen.getByTestId('set-a-0')).toHaveTextContent('7')
    expect(screen.getByTestId('set-b-0').querySelector('sup')).toHaveTextContent('5')
  })

  it('marks the last-point winner on the points column', () => {
    const state = winPoint(createMatch(config, meta), 'a')
    const serve = getServeInfo(state)
    render(
      <TvScoreboard
        state={state}
        serve={serve}
        nameOf={(id) => (id === 'p1' ? 'Federer' : 'Nadal')}
        theme="wimbledon"
      />,
    )
    expect(screen.getByTestId('points-a')).toHaveAttribute('data-last-point', 'true')
    expect(screen.getByTestId('points-b')).not.toHaveAttribute('data-last-point')
  })

  it('hides the trailing 40 when one side has AD', () => {
    let state = createMatch(config, meta)
    for (let i = 0; i < 3; i++) state = winPoint(state, 'a')
    for (let i = 0; i < 3; i++) state = winPoint(state, 'b')
    state = winPoint(state, 'a')
    const serve = getServeInfo(state)
    render(
      <TvScoreboard
        state={state}
        serve={serve}
        nameOf={(id) => (id === 'p1' ? 'Federer' : 'Nadal')}
        theme="wimbledon"
      />,
    )
    expect(screen.getByTestId('points-a')).toHaveTextContent('AD')
    expect(screen.getByTestId('points-b')).toHaveTextContent('')
  })

  it('marks current-set games at 0-0 after a game', () => {
    const state = clearOverlay(winGame(createMatch(config, meta), 'a'))
    const serve = getServeInfo(state)
    render(
      <TvScoreboard
        state={state}
        serve={serve}
        nameOf={(id) => (id === 'p1' ? 'Federer' : 'Nadal')}
        theme="wimbledon"
      />,
    )
    expect(screen.getByTestId('set-a-0')).toHaveAttribute('data-last-point', 'true')
    expect(screen.getByTestId('points-a')).not.toHaveAttribute('data-last-point')
  })
})
