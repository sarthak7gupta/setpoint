import { Dialog } from './Dialog'
/** Live recap modal — point-by-point board from Match Summary. */
import { View } from 'react-native'
import type { MatchState, Side } from '../engine'
import { useT } from '../i18n/useT'
import { AppButton, Screen, Title } from '../styles/ui'
import { MatchRecap } from './MatchRecap'

export function LiveRecapOverlay(args: {
  state: MatchState
  nameOf: (id: string) => string
  sideName: (side: Side) => string
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
        <View testID="live-recap">
          <Title style={{ marginBottom: 8 }}>{t('live.recap')}</Title>
        </View>
        <MatchRecap state={args.state} nameOf={args.nameOf} sideName={args.sideName} />
        <AppButton
          variant="accent"
          onPress={args.onClose}
          testID="close-live-recap"
          style={{ marginTop: 16 }}
        >
          {t('live.closeRecap')}
        </AppButton>
      </Screen>
    </Dialog>
  )
}
