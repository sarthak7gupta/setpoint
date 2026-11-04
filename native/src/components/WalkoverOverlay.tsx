import { Dialog } from './Dialog'
/** Award a walkover from the live match More menu. */
import { useState } from 'react'
import { View } from 'react-native'
import type { Side } from '../engine'
import { useT } from '../i18n/useT'
import { AppButton, Muted, Row, Screen, Stack, Title } from '../styles/ui'

type WalkoverStep = 'pick' | 'confirm'

export function WalkoverOverlay(args: {
  sideName: (side: Side) => string
  onWalkover: (winnerSide: Side) => void
  onClose: () => void
}) {
  const t = useT()
  const [step, setStep] = useState<WalkoverStep>('pick')
  const [side, setSide] = useState<Side | null>(null)

  return (
    <Dialog
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={args.onClose}
    >
      <Screen>
        <View testID="walkover-overlay">
          <Title>{t('live.walkover')}</Title>
        </View>
        <Muted style={{ marginBottom: 16 }}>{t('live.walkoverHint')}</Muted>
        {step === 'pick' && (
          <Stack $gap={8} testID="walkover-pick">
            <Muted>{t('live.walkoverWho')}</Muted>
            <Row $gap={8} $wrap>
              {(['a', 'b'] as Side[]).map((winner) => (
                <AppButton
                  key={winner}
                  variant="ghost"
                  onPress={() => {
                    setSide(winner)
                    setStep('confirm')
                  }}
                  testID={`walkover-pick-${winner}`}
                >
                  {t('live.walkoverAward', { name: args.sideName(winner) })}
                </AppButton>
              ))}
            </Row>
            <AppButton variant="ghost" onPress={args.onClose} testID="close-walkover">
              {t('common.cancel')}
            </AppButton>
          </Stack>
        )}
        {step === 'confirm' && side && (
          <Stack $gap={8} testID="walkover-confirm">
            <Muted>{t('live.walkoverConfirm', { name: args.sideName(side) })}</Muted>
            <Row $gap={8} $wrap>
              <AppButton
                variant="danger"
                onPress={() => {
                  args.onWalkover(side)
                  args.onClose()
                }}
                testID="confirm-walkover"
              >
                {t('live.walkoverConfirmAction')}
              </AppButton>
              <AppButton
                variant="ghost"
                onPress={() => {
                  setSide(null)
                  setStep('pick')
                }}
                testID="walkover-back"
              >
                {t('live.walkoverBack')}
              </AppButton>
            </Row>
          </Stack>
        )}
      </Screen>
    </Dialog>
  )
}
