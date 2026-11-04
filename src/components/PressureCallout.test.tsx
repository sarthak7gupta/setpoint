import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getPressureSituation } from '../engine/pressure'
import { freshSingles, winPoint } from '../engine/testHelpers'
import { PressureCallout } from './PressureCallout'

describe('PressureCallout', () => {
  it('renders break point labels', () => {
    let s = freshSingles()
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    s = winPoint(s, 'b')
    const sit = getPressureSituation(s)!
    render(<PressureCallout situation={sit} />)
    expect(screen.getByTestId('pressure-callout')).toHaveTextContent('3 break points')
  })
})
