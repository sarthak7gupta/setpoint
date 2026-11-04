export type RootStackParamList = {
  Home: undefined
  NewMatch: { from?: string } | undefined
  LiveMatch: { matchId: string }
  MatchSummary: { matchId: string }
  History: undefined
  Profiles: undefined
  Settings: undefined
  WatchMatch: undefined
  WatchLive: { url: string }
}
