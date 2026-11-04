/**
 * Format set scores with TV-style tiebreak superscript on the loser's 6.
 * Example: 7–6⁸ (loser had 8 points in the tiebreak).
 */
import type { SetScore, Side } from './types'

/** Loser's tiebreak point total for a completed TB set; otherwise null. */
export function tiebreakLoserPoints(set: SetScore): number | null {
  if (!set.completed || !set.isTiebreak || !set.winner) return null
  return set.winner === 'a' ? set.tiebreakPointsB : set.tiebreakPointsA
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'

export function toSuperscriptDigits(n: number): string {
  return String(n)
    .split('')
    .map((ch) => {
      const d = Number(ch)
      return Number.isInteger(d) ? SUP[d] : ch
    })
    .join('')
}

/**
 * Plain-text set score, e.g. `7-6⁸` or `6⁸-7`.
 * Superscript sits next to the loser's 6.
 */
export function formatSetScore(set: SetScore): string {
  const tb = tiebreakLoserPoints(set)
  if (tb === null) return `${set.gamesA}-${set.gamesB}`
  const sup = toSuperscriptDigits(tb)
  if (set.winner === 'a') return `${set.gamesA}-${set.gamesB}${sup}`
  return `${set.gamesA}${sup}-${set.gamesB}`
}

/** TB superscript to show on a given side's games cell (only on the loser's 6). */
export function tiebreakSuperscriptForSide(set: SetScore, side: Side): number | null {
  const tb = tiebreakLoserPoints(set)
  if (tb === null || !set.winner) return null
  if (side === set.winner) return null
  return tb
}
