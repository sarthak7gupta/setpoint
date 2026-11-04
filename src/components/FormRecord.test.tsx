import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormDots, HeadToHeadCard } from './FormRecord'

describe('FormDots', () => {
  it('renders five dots in oldest-to-newest order', () => {
    render(<FormDots results={['empty', 'empty', 'win', 'loss', 'win']} testId="form-dots" />)
    const dots = screen.getByTestId('form-dots').querySelectorAll('[data-result]')
    expect(Array.from(dots, (el) => el.getAttribute('data-result'))).toEqual([
      'empty',
      'empty',
      'win',
      'loss',
      'win',
    ])
  })
})

describe('HeadToHeadCard', () => {
  it('shows the pair record', () => {
    render(<HeadToHeadCard labelA="Alice" labelB="Bob" h2h={{ meetings: 2, winsA: 1, winsB: 1 }} />)
    expect(screen.getByTestId('head-to-head')).toHaveTextContent('1–1')
    expect(screen.getByTestId('head-to-head')).toHaveTextContent('2 meetings')
  })
})
