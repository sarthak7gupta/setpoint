import type { MatchConfig } from './types'
export const isFinalSetIndex = (config: MatchConfig, index: number) => index === config.bestOf - 1
export const tiebreakTargetForSet = (config: MatchConfig, index: number) =>
  isFinalSetIndex(config, index) && index > 0 && config.finalSetTiebreak
    ? config.finalSetTiebreakPoints
    : config.tiebreakPoints
export const usesTiebreak = (config: MatchConfig, index: number) =>
  !isFinalSetIndex(config, index) || config.finalSetTiebreak
