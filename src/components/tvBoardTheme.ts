import { css } from 'styled-components'
import { type ThemeId, tvThemes } from '../themes'

export function tvBoardVars(theme: ThemeId) {
  const tv = tvThemes[theme]
  return css`
    --tv-name-bg: ${tv.nameBg};
    --tv-set-bg: ${tv.setBg};
    --tv-set-current: ${tv.setCurrent};
    --tv-points-bg: ${tv.pointsBg};
    --tv-points-text: ${tv.pointsText};
    --tv-won: ${tv.won};
    --tv-serve-accent: ${tv.serveAccent};
    --tv-receive-accent: ${tv.receiveAccent};
  `
}

/** Shared TV-bug colors so the live board and landing demo stay in lockstep. */
export function themeBoard(theme: ThemeId) {
  const tv = tvThemes[theme]
  return css`
    ${tvBoardVars(theme)}
    border: ${tv.borderWidth} solid ${tv.borderColor};
    border-radius: ${tv.borderRadius};
    background: ${tv.boardBg};
  `
}
