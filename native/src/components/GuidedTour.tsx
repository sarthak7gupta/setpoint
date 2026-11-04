import { Dialog } from './Dialog'
/** First-run walkthrough on Home. */
import { useState } from 'react'
import { View } from 'react-native'
import styled from 'styled-components/native'
import { useT } from '../i18n/useT'
import { AppButton, Row, Stack } from '../styles/ui'

const Backdrop = styled.View`
  flex: 1;
  justify-content: flex-end;
  background-color: rgba(0, 0, 0, 0.55);
  padding: 16px;
`

const Card = styled.View`
  background-color: ${(p) => p.theme.bgElevated};
  border-color: ${(p) => p.theme.line};
  border-width: 1px;
  border-radius: 16px;
  padding: 20px 18px 16px;
`

const StepDots = styled.View`
  flex-direction: row;
  gap: 6px;
  margin-bottom: 12px;
`

const Dot = styled.View<{ $active: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background-color: ${(p) => (p.$active ? p.theme.accent : p.theme.textMuted)};
  opacity: ${(p) => (p.$active ? 1 : 0.35)};
`

const Title = styled.Text`
  font-size: 22px;
  line-height: 26px;
  color: ${(p) => p.theme.text};
  font-family: ${(p) => p.theme.fontUiSemiBold};
  margin-bottom: 6px;
`

const Body = styled.Text`
  font-size: 15px;
  line-height: 22px;
  color: ${(p) => p.theme.textMuted};
  font-family: ${(p) => p.theme.fontUi};
`

const STEPS = [
  { title: 'tour.welcomeTitle', body: 'tour.welcomeBody' },
  { title: 'tour.newTitle', body: 'tour.newBody' },
  { title: 'tour.liveTitle', body: 'tour.liveBody' },
  { title: 'tour.moreTitle', body: 'tour.moreBody' },
] as const

export function GuidedTour(args: { onComplete: () => void }) {
  const t = useT()
  const [index, setIndex] = useState(0)
  const step = STEPS[index]
  const last = index === STEPS.length - 1

  return (
    <Dialog visible animationType="fade" transparent onRequestClose={args.onComplete}>
      <Backdrop testID="guided-tour">
        <Card>
          <StepDots>
            {STEPS.map((item, i) => (
              <Dot key={item.title} $active={i === index} />
            ))}
          </StepDots>
          <Stack $gap={16}>
            <View>
              <Title>{t(step.title)}</Title>
              <Body>{t(step.body)}</Body>
            </View>
            <Row $gap={8} $wrap style={{ justifyContent: 'space-between' }}>
              <AppButton variant="ghost" onPress={args.onComplete} testID="tour-skip">
                {t('tour.skip')}
              </AppButton>
              <AppButton
                variant="accent"
                onPress={() => {
                  if (last) args.onComplete()
                  else setIndex((n) => n + 1)
                }}
                testID="tour-next"
              >
                {last ? t('tour.done') : t('tour.next')}
              </AppButton>
            </Row>
          </Stack>
        </Card>
      </Backdrop>
    </Dialog>
  )
}
