import type { MatchConfig, MatchMetadata, MatchState } from './engine/types'

/** Stored player row — shared by Dexie (web) and AsyncStorage (native). */
export interface PlayerRecord {
  id: string
  name: string
  createdAt: number
  mergedInto?: string
  notes?: string
}

/** Persisted match snapshot — platform DBs store this shape. */
export interface MatchRecord {
  id: string
  createdAt: number
  updatedAt: number
  completedAt?: number
  config: MatchConfig
  metadata: MatchMetadata
  state: MatchState
  playerNames: Record<string, string>
  /**
   * Prior scoring snapshots for live Undo (points + faults).
   * Cleared when the match completes. Omitted on older saves.
   */
  undoHistory?: MatchState[]
}
