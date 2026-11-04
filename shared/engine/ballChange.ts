/**
 * Ball-change schedule (ATP-style default: first after 7 games, then every 9).
 * The first interval is 7 because the warm-up is treated as two games of the
 * usual nine-game cycle. A completed tiebreak counts as one game toward the
 * total; if a change would fall on a tiebreak, it is deferred until after that
 * TB (shown following the set break / next opportunity).
 */
export function shouldBallChangeAfterGames(
  gamesCompletedInMatch: number,
  firstAt: number,
  every: number,
): boolean {
  if (gamesCompletedInMatch <= 0) return false
  if (!Number.isFinite(firstAt) || firstAt <= 0) return false
  if (gamesCompletedInMatch === firstAt) return true
  if (gamesCompletedInMatch < firstAt) return false
  if (!Number.isFinite(every) || every <= 0) return false
  return (gamesCompletedInMatch - firstAt) % every === 0
}

export function ballChangeConfig(config: {
  ballChangeEnabled?: boolean
  ballChangeFirstGames?: number
  ballChangeEveryGames?: number
}): { enabled: boolean; firstAt: number; every: number } {
  return {
    enabled: config.ballChangeEnabled !== false,
    firstAt: config.ballChangeFirstGames ?? 7,
    every: config.ballChangeEveryGames ?? 9,
  }
}

/** Whether the match game count alone says a ball change is due right now. */
export function isBallChangeDue(
  config: {
    ballChangeEnabled?: boolean
    ballChangeFirstGames?: number
    ballChangeEveryGames?: number
  },
  gamesCompletedInMatch: number,
): boolean {
  const { enabled, firstAt, every } = ballChangeConfig(config)
  return enabled && shouldBallChangeAfterGames(gamesCompletedInMatch, firstAt, every)
}
