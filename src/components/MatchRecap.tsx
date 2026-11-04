import { useState } from 'react'
import styled from 'styled-components'
import type { MatchState, Side } from '../engine'
import { playersOnSide } from '../engine'
import {
  abbrevName,
  buildMatchRecap,
  type RecapGame,
  type RecapMarker,
  recapIsBreak,
  recapServerSide,
} from '../stats/recap'

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const SetTitle = styled.h3`
  font-size: 1.4rem;
  margin: 0 0 0.35rem;
`

const SCORE_ROW = '1.15rem'

const GameCard = styled.div`
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.28);
  padding: 0.45rem 0.7rem 0.65rem;
`

/** Names | scrollable points */
const Body = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  column-gap: 0.35rem;
`

const NameCol = styled.div<{ $hasMarkers: boolean }>`
  display: grid;
  grid-template-rows: ${(p) => (p.$hasMarkers ? `1.1rem ${SCORE_ROW} ${SCORE_ROW}` : `${SCORE_ROW} ${SCORE_ROW}`)};
  row-gap: 0.2rem;
  align-items: stretch;
  width: max-content;
  flex: 0 0 auto;
`

const PointsScroll = styled.div`
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
`

const PointsGrid = styled.div`
  display: flex;
  column-gap: 0.2rem;
  align-items: start;
  width: max-content;
`

const PointCol = styled.div<{ $hovered: boolean; $hasMarkers: boolean }>`
  display: grid;
  grid-template-rows: ${(p) => (p.$hasMarkers ? `1.1rem ${SCORE_ROW} ${SCORE_ROW}` : `${SCORE_ROW} ${SCORE_ROW}`)};
  row-gap: 0.2rem;
  align-items: stretch;
  width: 2rem;
  cursor: default;
  border-radius: 4px;
  background: ${(p) => (p.$hovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent')};
`

const NameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-height: ${SCORE_ROW};
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  line-height: 1;
`

const ServeDot = styled.span<{ $broken: boolean }>`
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 50%;
  background: ${(p) => (p.$broken ? 'var(--danger, #e85d6a)' : 'var(--serve, #ccff00)')};
  flex: 0 0 0.42rem;
`

const ServeDotSlot = styled.span`
  width: 0.42rem;
  height: 0.42rem;
  flex: 0 0 0.42rem;
`

const NamePart = styled.span<{ $active: boolean }>`
  font-weight: ${(p) => (p.$active ? 800 : 500)};
  color: ${(p) => (p.$active ? 'var(--text)' : 'var(--text-muted)')};
`

const NameSep = styled.span`
  font-weight: 500;
  color: var(--text-muted);
`

const Marker = styled.span<{ $kind: RecapMarker }>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 1.1rem;
  box-sizing: border-box;
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-align: center;
  line-height: 1;
  padding: 0 0.15rem;
  border-radius: 3px;
  color: #fff;
  background: ${(p) =>
    p.$kind === 'MP'
      ? 'var(--green, #228b22)'
      : p.$kind === 'SP'
        ? 'var(--purple-bright)'
        : '#c43b6e'};
`

const Score = styled.span<{ $won: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: ${SCORE_ROW};
  text-align: center;
  font-family: var(--font-display);
  font-size: 1.15rem;
  line-height: 1;
  color: ${(p) => (p.$won ? 'var(--text)' : 'var(--text-muted)')};
  opacity: ${(p) => (p.$won ? 1 : 0.55)};
`

const GameFoot = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  flex-wrap: wrap;
  margin-top: 0.55rem;
  padding-top: 0.45rem;
  border-top: 1px solid var(--line);
`

const GameScore = styled.span`
  font-family: var(--font-display);
  font-size: 1.35rem;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.02em;
`

const Winner = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
`

function SideLabel(args: {
  state: MatchState
  side: Side
  serverId: string
  receiverId: string
  nameOf: (id: string) => string
  showServeDot: boolean
  broken: boolean
  nameTestIdPrefix: string
}) {
  const { state, side, serverId, receiverId, nameOf, showServeDot, broken, nameTestIdPrefix } = args
  const ids = playersOnSide(state.config, side)
  return (
    <NameCell>
      {showServeDot ? (
        <ServeDot $broken={broken} aria-label={broken ? 'Broken serve' : 'Serving'} />
      ) : (
        <ServeDotSlot aria-hidden />
      )}
      {ids.map((id, i) => {
        const active = id === serverId || id === receiverId
        return (
          <span key={id}>
            {i > 0 && <NameSep> / </NameSep>}
            <NamePart
              $active={active}
              data-testid={`${nameTestIdPrefix}-${id}`}
              data-active={active ? 'true' : 'false'}
            >
              {abbrevName(nameOf(id))}
            </NamePart>
          </span>
        )
      })}
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
  const nameTestIdPrefix = `recap-name-${setIndex}-${gameIndex}`
  const hasMarkers = game.columns.some((col) => col.marker != null)

  return (
    <GameCard>
      <Body>
        <NameCol $hasMarkers={hasMarkers}>
          {hasMarkers && <div />}
          <SideLabel
            state={state}
            side="a"
            serverId={game.serverId}
            receiverId={highlightReceiverId}
            nameOf={nameOf}
            showServeDot={serverSide === 'a'}
            broken={broken}
            nameTestIdPrefix={nameTestIdPrefix}
          />
          <SideLabel
            state={state}
            side="b"
            serverId={game.serverId}
            receiverId={highlightReceiverId}
            nameOf={nameOf}
            showServeDot={serverSide === 'b'}
            broken={broken}
            nameTestIdPrefix={nameTestIdPrefix}
          />
        </NameCol>
        <PointsScroll data-testid="recap-points-scroll">
          <PointsGrid onMouseLeave={() => setHoveredCol(null)}>
            {game.columns.map((col, i) => (
              <PointCol
                key={`${setIndex}-${gameIndex}-${i}`}
                $hovered={hoveredCol === i}
                $hasMarkers={hasMarkers}
                data-testid={`recap-col-${setIndex}-${gameIndex}-${i}`}
                onMouseEnter={() => setHoveredCol(i)}
              >
                {hasMarkers && (
                  <div>{col.marker ? <Marker $kind={col.marker}>{col.marker}</Marker> : null}</div>
                )}
                <Score $won={col.winnerSide === 'a'}>{col.scoreA}</Score>
                <Score $won={col.winnerSide === 'b'}>{col.scoreB}</Score>
              </PointCol>
            ))}
          </PointsGrid>
        </PointsScroll>
      </Body>
      <GameFoot data-testid="recap-game-score">
        <GameScore>
          {game.gamesA}–{game.gamesB}
        </GameScore>
        <Winner>
          {game.isTiebreak ? 'Tiebreak · ' : ''}
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
  const sets = buildMatchRecap(state)
  if (sets.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No points recorded.</p>
  }

  return (
    <Wrap data-testid="match-recap">
      {sets.map((set) => (
        <div key={set.setIndex}>
          <SetTitle>Set {set.setIndex + 1}</SetTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
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
          </div>
        </div>
      ))}
    </Wrap>
  )
}
