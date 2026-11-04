import type { PressureKind, PressureSituation } from '../engine/pressure'
import { PressureBanner, PressureLine } from '../styles/ui'

interface Props {
  situation: PressureSituation
}

export function PressureCallout({ situation }: Props) {
  const kind: PressureKind = situation.primaryKind
  return (
    <PressureBanner $kind={kind} data-testid="pressure-callout" role="status">
      {situation.labels.map((line) => (
        <PressureLine key={line}>{line}</PressureLine>
      ))}
    </PressureBanner>
  )
}
