/**
 * Public product landing at `/`. The scorer lives at `/app`.
 * `?source=pwa` (older home-screen installs) redirects into the app.
 */
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { themeBoard, tvBoardVars } from '../components/tvBoardTheme'
import { useApp } from '../context/AppContext'
import { serveGlyph, type ThemeId, themeLabels, themeOrder, themeSwatches } from '../themes'

const pageGutter = css`
  width: min(1120px, calc(100% - 2rem));
  margin-inline: auto;
`

const Shell = styled.div`
  padding-bottom: 3.5rem;
`

const TopBar = styled.header`
  ${pageGutter}
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1.15rem;
  padding-bottom: 0.75rem;
`

const Logo = styled.span`
  font-family: var(--font-display);
  font-size: 1.85rem;
  letter-spacing: 0.08em;
  color: var(--accent);
`

const NavRow = styled.nav`
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  justify-content: flex-end;
`

const NavLink = styled(Link)<{ $primary?: boolean }>`
  text-decoration: none;
  border-radius: 999px;
  padding: 0.55rem 0.95rem;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid var(--line);
  color: var(--text);
  background: ${(p) => (p.$primary ? 'var(--purple)' : 'transparent')};
`

const Hero = styled.section`
  ${pageGutter}
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 2.5rem;
  align-items: center;
  padding: 2.4rem 0 3rem;
  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    padding-top: 1.4rem;
  }
`

const Eyebrow = styled.p`
  margin: 0 0 0.7rem;
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`

const Headline = styled.h1`
  font-size: clamp(3.2rem, 8vw, 5.6rem);
  line-height: 0.9;
  margin: 0 0 1rem;
  max-width: 12ch;
`

const Lead = styled.p`
  margin: 0 0 1.6rem;
  color: var(--text-muted);
  font-size: 1.08rem;
  line-height: 1.55;
  max-width: 38rem;
`

const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
`

const Cta = styled(Link)<{ $ghost?: boolean }>`
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  padding: 0.95rem 1.25rem;
  font-weight: 700;
  border: 1px solid ${(p) => (p.$ghost ? 'var(--line)' : 'transparent')};
  background: ${(p) =>
    p.$ghost ? 'transparent' : 'linear-gradient(135deg, var(--purple-bright), var(--purple))'};
  color: var(--text);
`

const Proof = styled.ul`
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 1.1rem;
  padding: 0;
  margin: 1.6rem 0 0;
  color: var(--text-muted);
  font-size: 0.88rem;
`

const BugWrap = styled.figure<{ $theme: ThemeId }>`
  margin: 0;
  min-width: 0;
  ${(p) => tvBoardVars(p.$theme)}
`

const Callout = styled.div`
  display: inline-block;
  background: var(--tv-points-bg);
  color: var(--tv-points-text);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.32rem 0.55rem;
  line-height: 1;
`

const Board = styled.div<{ $theme: ThemeId }>`
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  ${(p) => themeBoard(p.$theme)}
`

const BoardRow = styled.div`
  display: grid;
  grid-template-columns: minmax(7.2rem, 1.7fr) repeat(4, minmax(2rem, 2.35rem)) minmax(2.4rem, 2.7rem);
  align-items: stretch;
  min-height: 2.55rem;
  & + & {
    border-top: 1px solid rgba(255, 255, 255, 0.16);
  }
`

const Name = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem 0.35rem 0.55rem;
  background: var(--tv-name-bg);
  color: #fff;
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  min-width: 0;
`

const ServeMark = styled.span`
  flex: 0 0 auto;
  font-weight: 700;
  letter-spacing: -0.08em;
  color: var(--tv-serve-accent);
`

const Set = styled.span<{ $current?: boolean; $won?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(p) => (p.$won && !p.$current ? 'var(--tv-won)' : '#fff')};
  font-family: var(--font-display);
  font-size: 1.45rem;
  letter-spacing: 0.02em;
  background: ${(p) => (p.$current ? 'var(--tv-set-current)' : 'var(--tv-set-bg)')};
  border-left: 1px solid rgba(255, 255, 255, 0.12);
`

const Points = styled.span<{ $lastPoint?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tv-points-bg);
  color: var(--tv-points-text);
  font-family: var(--font-display);
  font-size: 1.45rem;
  letter-spacing: 0.02em;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  ${(p) =>
    p.$lastPoint &&
    css`
      -webkit-text-stroke: 0.45px currentColor;
      text-shadow: 0.35px 0 0 currentColor, -0.35px 0 0 currentColor;
      padding-top: 0.08em;
    `}
`

const Band = styled.section`
  ${pageGutter}
  padding: 0.5rem 0 2.4rem;
`

const SectionTitle = styled.h2`
  font-size: clamp(2rem, 5vw, 2.8rem);
  margin: 0 0 0.45rem;
`

const SectionLead = styled.p`
  margin: 0 0 1.4rem;
  color: var(--text-muted);
  max-width: 40rem;
  line-height: 1.5;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.85rem;
  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`

const Card = styled.article`
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.22);
  padding: 1.1rem 1.15rem 1.2rem;
`

const CardTitle = styled.h3`
  font-size: 1.45rem;
  margin: 0 0 0.4rem;
`

const CardBody = styled.p`
  margin: 0;
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.5;
`

const Split = styled.section`
  ${pageGutter}
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  padding-bottom: 2.6rem;
  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`

const ThemeRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.65rem;
  @media (max-width: 720px) {
    grid-template-columns: 1fr 1fr;
  }
`

const ThemeChip = styled.button<{ $tone: string; $selected?: boolean }>`
  appearance: none;
  width: 100%;
  border: none;
  border-radius: 14px;
  min-height: 4.4rem;
  display: flex;
  align-items: flex-end;
  padding: 0.7rem 0.8rem;
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  text-align: left;
  cursor: pointer;
  background: ${(p) => p.$tone};
  color: #f7f4ee;
  opacity: ${(p) => (p.$selected ? 1 : 0.62)};
  transition: opacity 0.15s ease, transform 0.15s ease;
  &:hover {
    opacity: 1;
    transform: scale(1.02);
  }
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
`

const Footer = styled.footer`
  ${pageGutter}
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding-top: 1.5rem;
  border-top: 1px solid var(--line);
  color: var(--text-muted);
  font-size: 0.88rem;
`

const FEATURES = [
  {
    title: 'Court-first scoring',
    body: 'Big point buttons, optional shot tags, undo, pause, and skippable break timers. First-serve fault is orange; double fault is red. Eyes stay on the rally.',
  },
  {
    title: 'Real tennis rules',
    body: 'Singles and doubles, best of 1 / 3 / 5, tiebreaks, no-ad or advantage games, advantage final sets, changeovers, warm-up, and ATP-style ball changes. At advantage the board shows AD and leaves the other box blank.',
  },
  {
    title: 'Pressure, live',
    body: 'Deuce, break point, set point, match point — including “serving for the set” at love-all.',
  },
  {
    title: 'Voice on court',
    body: 'Spoken umpire lines after each point. Tap the mic and say a name, ace, fault, undo, pause, or skip. Hands can stay on the racquet.',
  },
  {
    title: 'Stats that follow the match',
    body: 'Serve, return, and pressure numbers while the match is still on. Open recap from More for the point-by-point board. Filter by break points, tiebreak, or the final set — on court or after.',
  },
  {
    title: 'Phone across the net',
    body: 'Big screen locks landscape with a larger board. On the same Wi‑Fi, Watch a match to follow the score, stats, and recap — view only. The match clock only runs while you are on that match.',
  },
  {
    title: 'Private by default',
    body: 'No account. Matches, players, and settings stay on this phone. Recent form and head-to-head come from matches you’ve scored here.',
  },
] as const

export function Marketing() {
  const [params] = useSearchParams()
  const { theme, setTheme } = useApp()
  if (params.get('source') === 'pwa') {
    return <Navigate to="/app" replace />
  }

  return (
    <Shell>
      <TopBar>
        <Logo>SetPoint</Logo>
        <NavRow>
          <NavLink to="/app">Open app</NavLink>
          <NavLink to="/new" $primary>
            New match
          </NavLink>
        </NavRow>
      </TopBar>

      <Hero>
        <div>
          <Eyebrow>Offline tennis scorer</Eyebrow>
          <Headline>Keep score like a slam.</Headline>
          <Lead>
            SetPoint is the court-side scoresheet that already knows the rules. Singles or doubles,
            tap a point — or say it — and the board, the clock, and the stats stay with you when the
            signal drops.
          </Lead>
          <CtaRow>
            <Cta to="/app">Open the scorer</Cta>
            <Cta to="/new" $ghost>
              Start a match
            </Cta>
          </CtaRow>
          <Proof>
            <li>No account</li>
            <li>Works offline</li>
            <li>On your phone or in the browser</li>
            <li>Data stays on this device</li>
          </Proof>
        </div>

        <BugWrap
          $theme={theme}
          aria-label="Sinner leads Alcaraz 6-4, 7-6, 4-6, 5-3, 40-0. Alcaraz serving. Three championship points."
        >
          <Callout>3 Championship Points</Callout>
          <Board $theme={theme} data-testid="landing-scoreboard" data-board-theme={theme}>
            <BoardRow>
              <Name>Sinner</Name>
              <Set $won>6</Set>
              <Set $won>7</Set>
              <Set>4</Set>
              <Set $current>5</Set>
              <Points $lastPoint data-last-point="true">
                40
              </Points>
            </BoardRow>
            <BoardRow>
              <Name>
                <ServeMark aria-hidden="true">{serveGlyph(theme)}</ServeMark>
                Alcaraz
              </Name>
              <Set>4</Set>
              <Set>6</Set>
              <Set $won>6</Set>
              <Set $current>3</Set>
              <Points>0</Points>
            </BoardRow>
          </Board>
        </BugWrap>
      </Hero>

      <Band>
        <SectionTitle>Everything the chair umpire tracks.</SectionTitle>
        <SectionLead>Built for club nights and long best-of-fives alike.</SectionLead>
        <Grid>
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardTitle>{feature.title}</CardTitle>
              <CardBody>{feature.body}</CardBody>
            </Card>
          ))}
        </Grid>
      </Band>

      <Split>
        <Card>
          <CardTitle>After the handshake</CardTitle>
          <CardBody>
            Recap every point with break, set, and match-point markers — from More while the match
            is live, or after the handshake. Rematch copies the same people and rules. Profiles roll
            career serve, return, and pressure numbers across every match on the phone.
          </CardBody>
        </Card>
        <Card>
          <CardTitle>Take it with you</CardTitle>
          <CardBody>
            Add SetPoint to your home screen and it opens straight into scoring. Turn on big screen
            to lock landscape across the net. It works without a signal, and your matches stay on
            the phone.
          </CardBody>
        </Card>
      </Split>

      <Band>
        <SectionTitle>Four slam themes.</SectionTitle>
        <SectionLead>
          Centre Court, Rod Laver Arena, Court Philippe Chatrier, Arthur Ashe Stadium. Pick a court.
        </SectionLead>
        <ThemeRow>
          {themeOrder.map((id) => (
            <ThemeChip
              key={id}
              type="button"
              $tone={themeSwatches[id]}
              $selected={theme === id}
              aria-pressed={theme === id}
              aria-label={`Use ${themeLabels[id]} theme`}
              onClick={() => void setTheme(id)}
            >
              {themeLabels[id]}
            </ThemeChip>
          ))}
        </ThemeRow>
      </Band>

      <Footer>
        <span>SetPoint — tennis scoring that stays on your phone.</span>
        <NavLink to="/app">Go to the app</NavLink>
      </Footer>
    </Shell>
  )
}
