import type { PressureKind, PressureSituation } from '../engine/pressure'
import { PressureBanner, PressureLine } from '../styles/ui'

interface Props {
  situation: PressureSituation
}

export function PressureCallout({ situation }: Props) {
  const kind: PressureKind = situation.primaryKind
  return (
    <PressureBanner $kind={kind} testID="pressure-callout">
      {situation.labels.map((line, index) => (
        <PressureLine key={line} $muted={index > 0}>
          {index > 0 ? `· ${line}` : line}
        </PressureLine>
      ))}
    </PressureBanner>
  )
}
