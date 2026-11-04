import { Dialog } from './Dialog'
/** Live stats modal — same panel as the web overlay, with native strings. */
import { View } from 'react-native'
import type { MatchState } from '../engine'
import { useT } from '../i18n/useT'
import { AppButton, Screen, Title } from '../styles/ui'
import { MatchStatsPanel } from './MatchStatsPanel'

export function LiveStatsOverlay(args: {
  state: MatchState
  nameOf: (id: string) => string
  onClose: () => void
}) {
  const t = useT()
  return (
    <Dialog
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={args.onClose}
    >
      <Screen>
        <View testID="live-stats">
          <Title style={{ marginBottom: 8 }}>{t('live.stats')}</Title>
        </View>
        <MatchStatsPanel state={args.state} nameOf={args.nameOf} />
        <AppButton
          variant="accent"
          onPress={args.onClose}
          testID="close-live-stats"
          style={{ marginTop: 16 }}
        >
          {t('live.closeStats')}
        </AppButton>
      </Screen>
    </Dialog>
  )
}
