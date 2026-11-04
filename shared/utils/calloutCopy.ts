import type { CalloutKey, CalloutTranslate } from './gameCallout'

const en: Record<CalloutKey, string> = {
  'callout.game': 'Game, {name}.',
  'callout.gameSet': 'Game and set, {name}.',
  'callout.gameSetMatch': 'Game, set and match, {name}.',
  'callout.firstSet': 'first set',
  'callout.secondSet': 'second set',
  'callout.thirdSet': 'third set',
  'callout.fourthSet': 'fourth set',
  'callout.fifthSet': 'fifth set',
  'callout.time': 'Time.',
  'callout.serveTo': '{server} to serve.',
  'callout.setServeTo': '{set}, {server} to serve.',
  'callout.points': '{server} {receiver}.',
  'callout.pointsAll': '{score} all.',
  'callout.love': 'love',
  'callout.deuce': 'Deuce.',
  'callout.decidingPoint': 'Deciding point.',
  'callout.advantage': 'Advantage, {name}.',
  'callout.fault': 'Fault.',
  'callout.doubleFault': 'Double fault.',
  'callout.gamesAll': '{games} games all.',
  'callout.tiebreak': 'Tiebreak.',
}

/** English umpire lines for the web app and unit tests. */
export const englishCallout: CalloutTranslate = (key, vars) => {
  let text = en[key]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}
