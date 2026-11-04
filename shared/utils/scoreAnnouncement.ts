import { playersOnSide } from '../engine/helpers'
import { formatGameScore } from '../engine/scoring'
import { formatSetScore } from '../engine/setScore'
import type { MatchState, ServeInfo } from '../engine/types'
import type { TxKey } from '../i18n'

export function scoreAnnouncement(
  state: MatchState,
  serve: ServeInfo,
  nameOf: (id: string) => string,
  t: (key: TxKey, vars?: Record<string, string | number>) => string,
): string {
  const points = formatGameScore(state)
  const side = (s: 'a' | 'b') => playersOnSide(state.config, s).map(nameOf).join(' / ')
  return t('a11y.score', {
    a: side('a'),
    b: side('b'),
    pointsA: points.pointsA === 'AD' ? t('a11y.advantage') : points.pointsA || '40',
    pointsB: points.pointsB === 'AD' ? t('a11y.advantage') : points.pointsB || '40',
    sets: state.sets
      .map((set, i) => t('a11y.set', { set: i + 1, score: formatSetScore(set) }))
      .join('; '),
    server: nameOf(serve.serverId),
  })
}
