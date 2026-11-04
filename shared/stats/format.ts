/** Shared percent / fraction formatting for stats displays. */

export function percent(won: number, total: number): number | null {
  if (total === 0) return null
  return Math.round((won / total) * 1000) / 10
}

/** Display as `won/total (pct%)`, or `won/total` when there were no attempts. */
export function formatFraction(won: number, total: number): string {
  const base = `${won}/${total}`
  const p = percent(won, total)
  if (p === null) return base
  return `${base} (${p}%)`
}
