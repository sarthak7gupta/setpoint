import styled, { css, keyframes } from 'styled-components'
import { scoreAnnouncement } from '../../shared/utils/scoreAnnouncement'
import {
  formatGameScore,
  lastPointMark,
  type MatchState,
  playersOnSide,
  type ServeInfo,
  type Side,
  tiebreakSuperscriptForSide,
} from '../engine'
import { useT } from '../i18n/useT'
import { serveGlyph, type ThemeId } from '../themes'
import { themeBoard } from './tvBoardTheme'

const pulseServe = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.75; transform: scale(1.08); }
`

const Board = styled.div<{ $theme: ThemeId }>`
  width: 100%;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  font-family: 'DM Sans', system-ui, sans-serif;
  ${(p) => themeBoard(p.$theme)}
`

const Row = styled.div<{ $big?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) auto minmax(${(p) => (p.$big ? '4.5rem' : '3.2rem')}, 0.55fr);
  align-items: stretch;
  min-height: ${(p) => (p.$big ? '4.4rem' : '2.85rem')};
  & + & {
    border-top: 1px solid rgba(255, 255, 255, 0.18);
  }
`

const NameCell = styled.div<{ $serving?: boolean; $big?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${(p) => (p.$big ? '0.55rem' : '0.4rem')};
  padding: ${(p) => (p.$big ? '0.7rem 0.9rem' : '0.45rem 0.65rem')};
  background: var(--tv-name-bg);
  min-width: 0;
  ${(p) =>
    p.$serving &&
    css`
      box-shadow: inset 3px 0 0 var(--tv-serve-accent);
    `}
`

const ServeGlyph = styled.span<{ $big?: boolean }>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${(p) => (p.$big ? '1.35rem' : '1rem')};
  color: var(--tv-serve-accent);
  animation: ${pulseServe} 1.4s ease-in-out infinite;
  font-size: ${(p) => (p.$big ? '1.15rem' : '0.85rem')};
  line-height: 1;
`

const NameText = styled.div<{ $big?: boolean }>`
  min-width: 0;
  flex: 1;
  font-size: ${(p) => (p.$big ? '1.35rem' : '0.92rem')};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const NamePart = styled.span<{ $active: boolean }>`
  font-weight: ${(p) => (p.$active ? 800 : 500)};
  color: ${(p) => (p.$active ? '#fff' : 'rgba(255, 255, 255, 0.85)')};
`

const NameSep = styled.span`
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
`

const Sets = styled.div`
  display: flex;
  align-items: stretch;
`

const lastPointEmphasis = css`
  -webkit-text-stroke: 0.45px currentColor;
  text-shadow: 0.35px 0 0 currentColor, -0.35px 0 0 currentColor;
  padding-top: 0.08em;
  padding-bottom: 0.04em;
`

const SetCol = styled.div<{
  $current?: boolean
  $wonA?: boolean
  $wonB?: boolean
  $row: Side
  $big?: boolean
  $lastPoint?: boolean
}>`
  min-width: ${(p) => (p.$big ? '3rem' : '2rem')};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 ${(p) => (p.$big ? '0.55rem' : '0.4rem')};
  font-family: var(--font-display);
  font-size: ${(p) => (p.$big ? '2.15rem' : '1.35rem')};
  color: #fff;
  background: ${(p) => (p.$current ? 'var(--tv-set-current)' : 'var(--tv-set-bg)')};
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  line-height: 1.05;
  overflow: visible;
  ${(p) =>
    !p.$current &&
    ((p.$row === 'a' && p.$wonA) || (p.$row === 'b' && p.$wonB)) &&
    css`
      color: var(--tv-won);
    `}
  ${(p) => p.$lastPoint && lastPointEmphasis}
`

/** Inline wrapper so <sup> isn't flex-centered into a fake subscript. */
const SetGames = styled.span`
  position: relative;
  display: inline-block;
  line-height: 1.05;
  padding-right: 0.55em;
  overflow: visible;
`

const TbSup = styled.sup`
  position: absolute;
  top: -0.2em;
  left: calc(100% - 0.45em);
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 0.48em;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
`

const PointsCol = styled.div<{ $big?: boolean; $lastPoint?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tv-points-bg);
  color: var(--tv-points-text);
  font-family: var(--font-display);
  font-size: ${(p) => (p.$big ? '2.4rem' : '1.55rem')};
  letter-spacing: 0.02em;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  ${(p) => p.$lastPoint && lastPointEmphasis}
`

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/)
  return (parts[parts.length - 1] ?? full).toUpperCase()
}

function activePlayerId(serve: ServeInfo, side: Side): string {
  return serve.servingSide === side ? serve.serverId : serve.receiverId
}

interface Props {
  state: MatchState
  serve: ServeInfo
  nameOf: (id: string) => string
  theme: ThemeId
  size?: 'normal' | 'big'
}

export function TvScoreboard({ state, serve, nameOf, theme, size = 'normal' }: Props) {
  const t = useT()
  const big = size === 'big'
  const score = formatGameScore(state)
  const points: Record<Side, string> = { a: score.pointsA, b: score.pointsB }
  const mark = lastPointMark(state)

  const sets = state.sets
  const currentSetIndex = sets.findIndex((s) => !s.completed)
  const displaySets = sets.filter(
    (_, i) => i <= (currentSetIndex === -1 ? sets.length - 1 : currentSetIndex),
  )

  return (
    <Board
      role="group"
      aria-label={t('a11y.scoreboard')}
      $theme={theme}
      data-testid="tv-scoreboard"
      data-size={size}
    >
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {scoreAnnouncement(state, serve, nameOf, t)}
      </span>
      {(['a', 'b'] as Side[]).map((side) => {
        const serving = serve.servingSide === side
        const ids = playersOnSide(state.config, side)
        const activeId = activePlayerId(serve, side)
        return (
          <Row key={side} $big={big}>
            <NameCell $serving={serving} $big={big}>
              {serving && (
                <ServeGlyph $big={big} aria-hidden="true">
                  {serveGlyph(theme)}
                </ServeGlyph>
              )}
              <NameText $big={big} data-testid={`tv-name-${side}`}>
                {ids.map((id, i) => (
                  <span key={id}>
                    {i > 0 && <NameSep> / </NameSep>}
                    <NamePart
                      $active={id === activeId}
                      data-testid={id === activeId ? `tv-active-${side}` : `tv-partner-${side}`}
                    >
                      {shortName(nameOf(id))}
                    </NamePart>
                  </span>
                ))}
              </NameText>
            </NameCell>

            <Sets>
              {displaySets.map((set, i) => {
                const isCurrent = !set.completed && i === displaySets.length - 1
                const games = side === 'a' ? set.gamesA : set.gamesB
                const display =
                  isCurrent && set.isTiebreak
                    ? side === 'a'
                      ? set.tiebreakPointsA
                      : set.tiebreakPointsB
                    : games
                const tbSup =
                  !isCurrent && set.completed ? tiebreakSuperscriptForSide(set, side) : null
                return (
                  <SetCol
                    key={i}
                    $current={isCurrent}
                    $wonA={set.completed && set.winner === 'a'}
                    $wonB={set.completed && set.winner === 'b'}
                    $row={side}
                    $big={big}
                    $lastPoint={mark?.target === 'set' && mark.side === side && mark.setIndex === i}
                    data-testid={`set-${side}-${i}`}
                    data-last-point={
                      mark?.target === 'set' && mark.side === side && mark.setIndex === i
                        ? 'true'
                        : undefined
                    }
                  >
                    <SetGames>
                      {display}
                      {tbSup !== null && <TbSup>{tbSup}</TbSup>}
                    </SetGames>
                  </SetCol>
                )
              })}
            </Sets>

            <PointsCol
              $big={big}
              $lastPoint={mark?.target === 'points' && mark.side === side}
              data-testid={`points-${side}`}
              data-last-point={mark?.target === 'points' && mark.side === side ? 'true' : undefined}
            >
              {points[side]}
            </PointsCol>
          </Row>
        )
      })}
    </Board>
  )
}
