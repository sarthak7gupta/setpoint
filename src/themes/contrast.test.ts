import { expect, it } from 'vitest'
import { contrast } from '../../shared/utils/contrast'
import { designStyleOrder, getThemeVars, themeOrder } from './index'

it('keeps button text and muted surface text readable in all 24 theme variants', () => {
  for (const style of designStyleOrder)
    for (const theme of themeOrder) {
      const vars = getThemeVars(theme, style)
      for (const type of ['primary', 'accent'])
        for (const stop of ['start', 'end']) {
          expect(
            contrast(vars[`--button-${type}-text`], vars[`--button-${type}-${stop}`]),
            `${style}/${theme}/${type}`,
          ).toBeGreaterThanOrEqual(4.5)
        }
      for (const bg of ['--bg-deep', '--bg-mid', '--bg-elevated'])
        expect(
          contrast(vars['--text-muted'], vars[bg]),
          `${style}/${theme}/${bg}`,
        ).toBeGreaterThanOrEqual(4.5)
    }
})
