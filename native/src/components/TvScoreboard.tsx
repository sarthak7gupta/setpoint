import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Platform } from 'react-native'
import { scoreAnnouncement } from '../../../shared/utils/scoreAnnouncement'
import { useT } from '../i18n/useT'
import styled, { useTheme } from 'styled-components/native'
import {
  formatGameScore,
  lastPointMark,
  type MatchState,
  playersOnSide,
  type ServeInfo,
  type Side,
  tiebreakSuperscriptForSide,
} from '../engine'
import { serveGlyph, type ThemeId } from '../themes'

const Board = styled.View<{ $radius: number; $borderColor: string; $borderWidth: number }>`
  width: 100%;
  border-radius: ${(p) => p.$radius}px;
  overflow: hidden;
  border-width: ${(p) => p.$borderWidth}px;
  border-color: ${(p) => p.$borderColor};
`

const ScoreRow = styled.View<{ $big?: boolean }>`
  flex-direction: row;
  align-items: stretch;
  min-height: ${(p) => (p.$big ? 72 : 46)}px;
`

const NameCell = styled.View<{ $bg: string; $serving?: boolean; $accent: string; $big?: boolean }>`
  flex: 1.4;
  flex-direction: row;
  align-items: center;
  gap: ${(p) => (p.$big ? 10 : 6)}px;
  padding: ${(p) => (p.$big ? '12px 14px' : '7px 10px')};
  background-color: ${(p) => p.$bg};
  border-left-width: ${(p) => (p.$serving ? 3 : 0)}px;
  border-left-color: ${(p) => p.$accent};
`

const ServeGlyphText = styled.Text<{ $color: string; $big?: boolean }>`
  width: ${(p) => (p.$big ? 22 : 16)}px;
  color: ${(p) => p.$color};
  font-size: ${(p) => (p.$big ? 20 : 14)}px;
`

const NameLine = styled.Text<{ $big?: boolean }>`
  flex: 1;
  font-size: ${(p) => (p.$big ? 22 : 15)}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
`

const NamePart = styled.Text<{ $active: boolean }>`
  font-weight: ${(p) => (p.$active ? '800' : '500')};
  color: ${(p) => (p.$active ? '#fff' : 'rgba(255, 255, 255, 0.58)')};
`

const Divider = styled.View`
  height: 1px;
  background-color: rgba(255, 255, 255, 0.18);
`

const SetCol = styled.View<{ $bg: string; $big?: boolean }>`
  min-width: ${(p) => (p.$big ? 48 : 32)}px;
  align-items: center;
  justify-content: center;
  padding: 0 ${(p) => (p.$big ? 10 : 6)}px;
  background-color: ${(p) => p.$bg};
  border-left-width: 1px;
  border-left-color: rgba(255, 255, 255, 0.12);
`

const SetGames = styled.Text<{ $color: string; $big?: boolean; $lastPoint?: boolean }>`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: ${(p) => (p.$big ? 36 : 22)}px;
  font-weight: ${(p) => (p.$lastPoint ? '800' : '400')};
  color: ${(p) => p.$color};
  line-height: ${(p) => (p.$big ? 42 : 26)}px;
  padding-top: ${(p) => (p.$lastPoint ? 2 : 0)}px;
`

const TbSup = styled.Text<{ $big?: boolean }>`
  font-family: ${(p) => p.theme.fontUiBold};
  font-size: ${(p) => (p.$big ? 16 : 11)}px;
  color: #fff;
`

const PointsCol = styled.View<{ $bg: string; $big?: boolean }>`
  min-width: ${(p) => (p.$big ? 84 : 52)}px;
  align-items: center;
  justify-content: center;
  background-color: ${(p) => p.$bg};
  border-left-width: 1px;
  border-left-color: rgba(255, 255, 255, 0.2);
`

const PointsText = styled.Text<{ $color: string; $big?: boolean; $lastPoint?: boolean }>`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: ${(p) => (p.$big ? 42 : 25)}px;
  font-weight: ${(p) => (p.$lastPoint ? '800' : '400')};
  color: ${(p) => p.$color};
  padding-top: ${(p) => (p.$lastPoint ? 2 : 0)}px;
`

const ViewBlock = styled.View``

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

export function TvScoreboard({ state, serve, nameOf, theme: themeId, size = 'normal' }: Props) {
  const t = useT()
  const lastAnnounced = useRef(state.events.at(-1)?.id)
  useEffect(() => {
    const event = state.events.at(-1)?.id
    if (event !== lastAnnounced.current && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(scoreAnnouncement(state, serve, nameOf, t))
    lastAnnounced.current = event
  }, [state, serve, nameOf, t])

  const big = size === 'big'
  const appTheme = useTheme()
  const tv = appTheme.tv
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
      accessible
      accessibilityLabel={scoreAnnouncement(state, serve, nameOf, t)}
      accessibilityLiveRegion="polite"
      $radius={tv.borderRadius}
      $borderColor={tv.borderColor}
      $borderWidth={tv.borderWidth}
      testID="tv-scoreboard"
    >
      {(['a', 'b'] as Side[]).map((side, rowIndex) => {
        const serving = serve.servingSide === side
        const ids = playersOnSide(state.config, side)
        const activeId = activePlayerId(serve, side)
        return (
          <ViewBlock key={side}>
            {rowIndex > 0 && <Divider />}
            <ScoreRow $big={big}>
              <NameCell $bg={tv.nameBg} $serving={serving} $accent={tv.serveAccent} $big={big}>
                {serving && (
                  <ServeGlyphText $color={tv.serveAccent} $big={big}>
                    {serveGlyph(themeId)}
                  </ServeGlyphText>
                )}
                <NameLine $big={big} numberOfLines={1} testID={`tv-name-${side}`}>
                  {ids.map((id, i) => (
                    <NamePart key={id} $active={id === activeId}>
                      {i > 0 ? ' / ' : ''}
                      {shortName(nameOf(id))}
                    </NamePart>
                  ))}
                </NameLine>
              </NameCell>
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
                const won =
                  !isCurrent &&
                  ((side === 'a' && set.completed && set.winner === 'a') ||
                    (side === 'b' && set.completed && set.winner === 'b'))
                const lastPoint =
                  mark?.target === 'set' && mark.side === side && mark.setIndex === i
                return (
                  <SetCol
                    key={i}
                    $bg={isCurrent ? tv.setCurrent : tv.setBg}
                    $big={big}
                    testID={`set-${side}-${i}`}
                  >
                    <SetGames $color={won ? tv.won : '#fff'} $big={big} $lastPoint={lastPoint}>
                      {display}
                      {tbSup !== null ? <TbSup $big={big}>{tbSup}</TbSup> : null}
                    </SetGames>
                  </SetCol>
                )
              })}
              <PointsCol $bg={tv.pointsBg} $big={big} testID={`points-${side}`}>
                <PointsText
                  $color={tv.pointsText}
                  $big={big}
                  $lastPoint={mark?.target === 'points' && mark.side === side}
                >
                  {points[side]}
                </PointsText>
              </PointsCol>
            </ScoreRow>
          </ViewBlock>
        )
      })}
    </Board>
  )
}
