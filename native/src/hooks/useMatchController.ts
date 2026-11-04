import { createStartNewMatch, createUseMatchController } from '../../../shared/hooks/matchController'
import { getMatch, saveMatch } from '../db'

const store = { getMatch, saveMatch }

export const useMatchController = createUseMatchController(store)
export const startNewMatch = createStartNewMatch(store)
