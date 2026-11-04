import { useState, type ReactNode } from 'react'
import { ScrollView } from 'react-native'
import styled from 'styled-components/native'
import type { MatchState, Side } from '../engine'
import { playersOnSide } from '../engine'
import { useT } from '../i18n/useT'
import {
  abbrevName,
  buildMatchRecap,
  type RecapGame,
  type RecapMarker,
  recapIsBreak,
  recapServerSide,
} from '../stats/recap'
import { FeedbackPressable, Muted, Surface } from '../styles/ui'

const Wrap = styled.View`
  gap: 16px;
`

const SetTitle = styled.Text`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 22px;
  color: ${(p) => p.theme.text};
  margin-bottom: 6px;
`

function GameCard(args: { children: ReactNode }) {
  return (
    <Surface level="card" style={{ paddingTop: 7, paddingHorizontal: 11, paddingBottom: 10 }}>
      {args.children}
    </Surface>
  )
}

const Body = styled.View`
  flex-direction: row;
  align-items: flex-start;
  gap: 6px;
`

const NameCol = styled.View`
  flex-shrink: 0;
  gap: 3px;
`

const PointCol = styled(FeedbackPressable)<{ $hovered: boolean }>`
  width: 32px;
  align-items: center;
  justify-content: flex-start;
  gap: 3px;
  border-radius: 4px;
  background-color: ${(p) => (p.$hovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent')};
`

const NameCell = styled.View`
  flex-direction: row;
  align-items: center;
  min-height: 18px;
  gap: 4px;
`

const ServeDot = styled.View<{ $broken: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 4px;
  background-color: ${(p) => (p.$broken ? p.theme.danger : p.theme.serve)};
`

const ServeDotSlot = styled.View`
  width: 7px;
  height: 7px;
`

const NamePart = styled.Text<{ $active: boolean }>`
  font-size: 11px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  font-weight: ${(p) => (p.$active ? '800' : '500')};
  color: ${(p) => (p.$active ? p.theme.text : p.theme.textMuted)};
`

const Marker = styled.Text<{ $kind: RecapMarker }>`
  font-size: 9px;
  font-family: ${(p) => p.theme.fontUiBold};
  letter-spacing: 0.4px;
  text-align: center;
  color: #fff;
  padding: 0 2px;
  line-height: 14px;
  height: 14px;
  border-radius: 3px;
  overflow: hidden;
  background-color: ${(p) =>
    p.$kind === 'MP' ? p.theme.green : p.$kind === 'SP' ? p.theme.purpleBright : '#c43b6e'};
`

const MarkerSlot = styled.View`
  height: 14px;
`

const Score = styled.Text<{ $won: boolean }>`
  text-align: center;
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 18px;
  line-height: 18px;
  min-height: 18px;
  color: ${(p) => (p.$won ? p.theme.text : p.theme.textMuted)};
  opacity: ${(p) => (p.$won ? 1 : 0.55)};
`

const GameFoot = styled.View`
  flex-direction: row;
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;
  margin-top: 9px;
  padding-top: 7px;
  border-top-width: 1px;
  border-top-color: ${(p) => p.theme.line};
`

const GameScore = styled.Text`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 22px;
  color: ${(p) => p.theme.text};
`

const Winner = styled.Text`
  font-size: 13px;
  font-family: ${(p) => p.theme.fontUiSemiBold};
  color: ${(p) => p.theme.textMuted};
`

function SideLabel(args: {
  state: MatchState
  side: Side
  serverId: string
  receiverId: string
  nameOf: (id: string) => string
  showServeDot: boolean
  broken: boolean
}) {
  const ids = playersOnSide(args.state.config, args.side)
  return (
    <NameCell>
      {args.showServeDot ? <ServeDot $broken={args.broken} /> : <ServeDotSlot />}
      <NamePart $active={false} numberOfLines={1}>
        {ids.map((id, i) => {
          const active = id === args.serverId || id === args.receiverId
          return (
            <NamePart key={id} $active={active}>
              {i > 0 ? ' / ' : ''}
              {abbrevName(args.nameOf(id))}
            </NamePart>
          )
        })}
      </NamePart>
    </NameCell>
  )
}

function RecapGameCard(args: {
  state: MatchState
  game: RecapGame
  setIndex: number
  gameIndex: number
  nameOf: (id: string) => string
  sideName: (side: Side) => string
}) {
  const t = useT()
  const { state, game, setIndex, gameIndex, nameOf, sideName } = args
  const [hoveredCol, setHoveredCol] = useState<number | null>(null)
  const serverSide = recapServerSide(state, game.serverId)
  const broken = recapIsBreak({
    state,
    serverId: game.serverId,
    winner: game.winner,
  })
  const hovered = hoveredCol != null ? game.columns[hoveredCol] : undefined
  const highlightReceiverId = hovered?.receiverId ?? game.firstReceiverId
  const hasMarkers = game.columns.some((col) => col.marker != null)

  return (
    <GameCard>
      <Body>
        <NameCol>
          {hasMarkers && <MarkerSlot />}
          <SideLabel
            state={state}
            side="a"
            serverId={game.serverId}
            receiverId={highlightReceiverId}
            nameOf={nameOf}
            showServeDot={serverSide === 'a'}
            broken={broken}
          />
          <SideLabel
            state={state}
            side="b"
            serverId={game.serverId}
            receiverId={highlightReceiverId}
            nameOf={nameOf}
            showServeDot={serverSide === 'b'}
            broken={broken}
          />
        </NameCol>
        <ScrollView horizontal testID="recap-points-scroll" showsHorizontalScrollIndicator={false}>
          {game.columns.map((col, i) => (
            <PointCol
              key={`${setIndex}-${gameIndex}-${i}`}
              $hovered={hoveredCol === i}
              testID={`recap-col-${setIndex}-${gameIndex}-${i}`}
              onPressIn={() => setHoveredCol(i)}
              onPressOut={() => setHoveredCol(null)}
            >
              {hasMarkers ? (
                col.marker ? (
                  <Marker $kind={col.marker}>{col.marker}</Marker>
                ) : (
                  <MarkerSlot />
                )
              ) : null}
              <Score $won={col.winnerSide === 'a'}>{col.scoreA}</Score>
              <Score $won={col.winnerSide === 'b'}>{col.scoreB}</Score>
            </PointCol>
          ))}
        </ScrollView>
      </Body>
      <GameFoot testID="recap-game-score">
        <GameScore>
          {game.gamesA}–{game.gamesB}
        </GameScore>
        <Winner>
          {game.isTiebreak ? `${t('recap.tiebreak')} · ` : ''}
          {sideName(game.winner)}
        </Winner>
      </GameFoot>
    </GameCard>
  )
}

interface Props {
  state: MatchState
  nameOf: (id: string) => string
  sideName: (side: Side) => string
}

export function MatchRecap({ state, nameOf, sideName }: Props) {
  const t = useT()
  const sets = buildMatchRecap(state)
  if (sets.length === 0) {
    return <Muted>{t('summary.noPoints')}</Muted>
  }

  return (
    <Wrap testID="match-recap">
      {sets.map((set) => (
        <Wrap key={set.setIndex}>
          <SetTitle>{t('recap.set', { n: set.setIndex + 1 })}</SetTitle>
          {set.games.map((game, gi) => (
            <RecapGameCard
              key={`${set.setIndex}-${gi}`}
              state={state}
              game={game}
              setIndex={set.setIndex}
              gameIndex={gi}
              nameOf={nameOf}
              sideName={sideName}
            />
          ))}
        </Wrap>
      ))}
    </Wrap>
  )
}
