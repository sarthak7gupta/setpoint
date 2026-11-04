/**
 * Public scoring-engine API. Web (`src/engine`) and native (`native/src/engine`)
 * re-export this barrel so both UIs share one rule set.
 * @see docs/ENGINE.md
 */
export { ballChangeConfig, isBallChangeDue, shouldBallChangeAfterGames } from './ballChange'
export { isChangeover, isSetBreak } from './changeover'
export type { LastPointMark } from './helpers'
export {
  buildServeOrder,
  displayPoint,
  lastPointMark,
  oppositeSide,
  playersOnSide,
  sideOfPlayer,
} from './helpers'
export {
  ballChangeOverlayEnabled,
  overlayTimerEnabled,
  warmupManualOverlayEnabled,
} from './overlayTimers'
export type { PressureKind, PressureSituation } from './pressure'
export {
  formatPressureLabel,
  getPressureSituation,
  pressureFlagsForState,
  simultaneousGamePoints,
} from './pressure'
export {
  applyFault,
  applyPoint,
  applyWalkover,
  cloneState,
  createMatch,
  dismissOverlay,
  formatGameScore,
  getServeInfo,
  replayEvents,
  skipDisabledTimerOverlay,
  startWarmup,
  undoLastPoint,
  undoWalkover,
} from './scoring'
export { isInTiebreak, syncServeReceive } from './serve'
export {
  formatSetScore,
  tiebreakLoserPoints,
  tiebreakSuperscriptForSide,
  toSuperscriptDigits,
} from './setScore'
export type {
  CourtSurface,
  Format,
  MatchConfig,
  MatchMetadata,
  MatchState,
  PointInput,
  PointOutcome,
  ServeInfo,
  Side,
  ThemeId,
  TimeOfDay,
} from './types'
