import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { freshDoubles } from '../engine/testHelpers'
import { commonSettings } from '../settings'
import { defaultMatchSetup, matchConfigFromSetup, useMatchSetup } from './useMatchSetup'

it('hydrates untouched defaults while preserving user edits', () => {
  const { result, rerender } = renderHook(({ ready, settings }) => useMatchSetup(settings, ready), {
    initialProps: { ready: false, settings: commonSettings },
  })
  act(() => result.current.setField('weather', 'Windy'))
  rerender({
    ready: true,
    settings: { ...commonSettings, defaultWeather: 'Sunny', defaultBestOf: 5 },
  })
  expect(result.current.setup.weather).toBe('Windy')
  expect(result.current.setup.bestOf).toBe(5)
})
it('moves identities and serve selection together and copies atomically', () => {
  const { result } = renderHook(() => useMatchSetup(commonSettings, true))
  const state = freshDoubles()
  act(() =>
    result.current.copySetup({
      id: 'm',
      createdAt: 1,
      updatedAt: 1,
      state,
      config: state.config,
      metadata: state.metadata,
      playerNames: { a1: 'A', a2: 'B', b1: 'C', b2: 'D' },
    }),
  )
  act(() => result.current.swapSlots(0, 1))
  expect(result.current.setup.selectedIds[1]).toBe('a1')
  expect(result.current.setup.firstServerIndex).toBe(1)
  expect(matchConfigFromSetup(result.current.setup, ['a2', 'a1', 'b1', 'b2']).firstServerId).toBe(
    'a1',
  )
  expect(() => matchConfigFromSetup(defaultMatchSetup(commonSettings), ['p', 'p'])).toThrow()
})
