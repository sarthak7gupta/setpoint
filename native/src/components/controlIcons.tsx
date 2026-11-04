import Svg, { Path } from 'react-native-svg'
import styled, { useTheme } from 'styled-components/native'

const PauseGlyph = styled.View`
  flex-direction: row;
  align-items: stretch;
  gap: 3px;
  height: 14px;
`

const PauseBar = styled.View<{ $color: string }>`
  width: 4px;
  border-radius: 1px;
  background-color: ${(p) => p.$color};
`

const MicGlyph = styled.View`
  width: 14px;
  height: 16px;
  align-items: center;
`

const MicCapsule = styled.View<{ $color: string }>`
  width: 7px;
  height: 10px;
  border-radius: 4px;
  background-color: ${(p) => p.$color};
`

const MicStem = styled.View<{ $color: string }>`
  width: 2px;
  height: 3px;
  margin-top: 1px;
  background-color: ${(p) => p.$color};
`

const MicBase = styled.View<{ $color: string }>`
  width: 10px;
  height: 2px;
  border-radius: 1px;
  background-color: ${(p) => p.$color};
`

export function PauseIcon() {
  const theme = useTheme()
  return (
    <PauseGlyph>
      <PauseBar $color={theme.text} />
      <PauseBar $color={theme.text} />
    </PauseGlyph>
  )
}

export function MicIcon({ color }: { color: string }) {
  return (
    <MicGlyph>
      <MicCapsule $color={color} />
      <MicStem $color={color} />
      <MicBase $color={color} />
    </MicGlyph>
  )
}

/** Same speaker / mute glyph paths as the web `SpeakerIcon`. */
export function SpeakerIcon({ color, muted }: { color: string; muted?: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      <Path
        d="M11 5 6 9H3v6h3l5 4V5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {muted ? (
        <Path
          d="M4 4 20 20"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <Path
            d="M15.5 9.5a3.5 3.5 0 0 1 0 5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M18.5 7a6.5 6.5 0 0 1 0 10"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </Svg>
  )
}
