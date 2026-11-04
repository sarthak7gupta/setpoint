import { useT } from '../i18n/useT'
import { useEffect, useState } from 'react'
import styled from 'styled-components/native'
import type { MatchState } from '../engine'
import { formatMatchClock, matchElapsedMs } from '../utils/matchClock'

const ClockText = styled.Text`
  font-family: ${(p) => p.theme.fontUiSemiBold};
  font-size: 14px;
  letter-spacing: 0.6px;
  color: ${(p) => p.theme.textMuted};
`

interface Props {
  state: MatchState
  fallbackStart?: number
}

export function MatchClock({ state, fallbackStart }: Props) {
  const t = useT()
  const [now, setNow] = useState(() => Date.now())
  const frozen = state.isComplete || Boolean(state.pausedAt) || Boolean(state.awayAt)

  useEffect(() => {
    setNow(Date.now())
    if (frozen) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [frozen])

  const label = formatMatchClock(matchElapsedMs(state, { now, fallbackStart }))

  return <ClockText accessibilityLabel={t('a11y.clock', {time:label})} accessibilityLiveRegion="none" testID="match-clock">{label}</ClockText>
}
