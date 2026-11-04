import { Dialog } from './Dialog'
/** Mid-match editor for timers and court details. Scoring rules stay locked. Walkover is also under More. */
import { useState } from 'react'
import { View } from 'react-native'
import type { CourtSurface, MatchState, Side, TimeOfDay } from '../engine'
import { surfaceTxKey, todTxKey } from '../i18n'
import { useT } from '../i18n/useT'
import {
  AppButton,
  Field,
  Input,
  Muted,
  Row,
  Screen,
  SelectField,
  Stack,
  Title,
} from '../styles/ui'
import {
  liveMatchSettingsFrom,
  type LiveMatchSettings,
} from '../utils/matchMetadata'
import styled from 'styled-components/native'

const SectionTitle = styled.Text`
  font-size: 16px;
  font-family: ${(p) => p.theme.fontUiSemiBold};
  color: ${(p) => p.theme.text};
  margin-top: 8px;
`

type WalkoverStep = 'idle' | 'pick' | 'confirm'

export function MatchLiveSettingsOverlay(args: {
  state: MatchState
  sideName: (side: Side) => string
  onSave: (settings: LiveMatchSettings) => void
  onWalkover: (winnerSide: Side) => void
  onClose: () => void
}) {
  const t = useT()
  const [draft, setDraft] = useState(() => liveMatchSettingsFrom(args.state))
  const [walkoverStep, setWalkoverStep] = useState<WalkoverStep>('idle')
  const [walkoverSide, setWalkoverSide] = useState<Side | null>(null)

  const patch = (partial: Partial<LiveMatchSettings>) => {
    setDraft((current) => ({ ...current, ...partial }))
  }

  return (
    <Dialog
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={args.onClose}
    >
      <Screen keyboard>
        <View testID="live-settings">
          <Title>{t('live.matchSettings')}</Title>
        </View>
        <Muted style={{ marginBottom: 16 }}>{t('live.settingsHint')}</Muted>
        <Stack $gap={12}>
          <SectionTitle>{t('live.endMatch')}</SectionTitle>
          <Muted>{t('live.walkoverHint')}</Muted>
          {walkoverStep === 'idle' && (
            <AppButton
              variant="ghost"
              onPress={() => setWalkoverStep('pick')}
              testID="settings-open-walkover"
            >
              {t('live.walkover')}
            </AppButton>
          )}
          {walkoverStep === 'pick' && (
            <Stack $gap={8} testID="walkover-pick">
              <Muted>{t('live.walkoverWho')}</Muted>
              <Row $gap={8} $wrap>
                {(['a', 'b'] as Side[]).map((side) => (
                  <AppButton
                    key={side}
                    variant="ghost"
                    onPress={() => {
                      setWalkoverSide(side)
                      setWalkoverStep('confirm')
                    }}
                    testID={`walkover-pick-${side}`}
                  >
                    {t('live.walkoverAward', { name: args.sideName(side) })}
                  </AppButton>
                ))}
              </Row>
              <AppButton
                variant="ghost"
                onPress={() => setWalkoverStep('idle')}
                testID="walkover-cancel-pick"
              >
                {t('common.cancel')}
              </AppButton>
            </Stack>
          )}
          {walkoverStep === 'confirm' && walkoverSide && (
            <Stack $gap={8} testID="walkover-confirm">
              <Muted>
                {t('live.walkoverConfirm', { name: args.sideName(walkoverSide) })}
              </Muted>
              <Row $gap={8} $wrap>
                <AppButton
                  variant="danger"
                  onPress={() => {
                    args.onWalkover(walkoverSide)
                    args.onClose()
                  }}
                  testID="confirm-walkover"
                >
                  {t('live.walkoverConfirmAction')}
                </AppButton>
                <AppButton
                  variant="ghost"
                  onPress={() => {
                    setWalkoverSide(null)
                    setWalkoverStep('pick')
                  }}
                  testID="walkover-back"
                >
                  {t('live.walkoverBack')}
                </AppButton>
              </Row>
            </Stack>
          )}

          <SectionTitle>{t('live.timers')}</SectionTitle>
          <Field label={t('new.breakSec')}>
            <Input
              keyboardType="number-pad"
              value={String(draft.breakDurationSeconds)}
              onChangeText={(value) => patch({ breakDurationSeconds: Number(value) || 0 })}
              testID="live-break-sec"
            />
          </Field>
          <Field label={t('new.changeoverSec')}>
            <Input
              keyboardType="number-pad"
              value={String(draft.changeoverDurationSeconds)}
              onChangeText={(value) => patch({ changeoverDurationSeconds: Number(value) || 0 })}
              testID="live-changeover-sec"
            />
          </Field>
          <Field label={t('new.warmupSec')}>
            <Input
              keyboardType="number-pad"
              value={String(draft.warmupDurationSeconds)}
              onChangeText={(value) => patch({ warmupDurationSeconds: Number(value) || 0 })}
              testID="live-warmup-sec"
            />
          </Field>
          <SelectField
            label={t('new.ballReminders')}
            value={draft.ballChangeEnabled ? 'on' : 'off'}
            onChange={(value) => patch({ ballChangeEnabled: value === 'on' })}
            testID="live-ball-change"
            options={[
              { value: 'on', label: t('settings.on') },
              { value: 'off', label: t('settings.off') },
            ]}
          />
          {draft.ballChangeEnabled && (
            <>
              <Field label={t('new.ballFirst')}>
                <Input
                  keyboardType="number-pad"
                  value={String(draft.ballChangeFirstGames)}
                  onChangeText={(value) => patch({ ballChangeFirstGames: Number(value) || 1 })}
                  testID="live-ball-first"
                />
              </Field>
              <Field label={t('new.ballEvery')}>
                <Input
                  keyboardType="number-pad"
                  value={String(draft.ballChangeEveryGames)}
                  onChangeText={(value) => patch({ ballChangeEveryGames: Number(value) || 1 })}
                  testID="live-ball-every"
                />
              </Field>
              <Field label={t('new.ballSec')}>
                <Input
                  keyboardType="number-pad"
                  value={String(draft.ballChangeDurationSeconds)}
                  onChangeText={(value) =>
                    patch({ ballChangeDurationSeconds: Number(value) || 0 })
                  }
                  testID="live-ball-sec"
                />
              </Field>
            </>
          )}
          <SectionTitle>{t('new.details')}</SectionTitle>
          <Field label={t('new.date')}>
            <Input
              value={draft.date}
              onChangeText={(value) => patch({ date: value })}
              placeholder="YYYY-MM-DD"
              testID="live-date"
            />
          </Field>
          <SelectField
            label={t('new.timeOfDay')}
            value={draft.timeOfDay ?? 'afternoon'}
            onChange={(value) => patch({ timeOfDay: value as TimeOfDay })}
            testID="live-time-of-day"
            options={[
              { value: 'morning', label: t(todTxKey('morning')) },
              { value: 'afternoon', label: t(todTxKey('afternoon')) },
              { value: 'evening', label: t(todTxKey('evening')) },
              { value: 'night', label: t(todTxKey('night')) },
            ]}
          />
          <Field label={t('new.weather')}>
            <Input
              value={draft.weather}
              onChangeText={(value) => patch({ weather: value })}
              placeholder={t('new.weatherPlaceholder')}
              testID="live-weather"
            />
          </Field>
          <SelectField
            label={t('new.surface')}
            value={draft.courtSurface ?? 'hard'}
            onChange={(value) => patch({ courtSurface: value as CourtSurface })}
            testID="live-surface"
            options={[
              { value: 'hard', label: t(surfaceTxKey('hard')) },
              { value: 'concrete', label: t(surfaceTxKey('concrete')) },
              { value: 'clay', label: t(surfaceTxKey('clay')) },
              { value: 'grass', label: t(surfaceTxKey('grass')) },
              { value: 'carpet', label: t(surfaceTxKey('carpet')) },
              { value: 'indoor', label: t(surfaceTxKey('indoor')) },
            ]}
          />
          <Field label={t('new.notes')}>
            <Input
              value={draft.notes}
              onChangeText={(value) => patch({ notes: value })}
              multiline
              style={{ minHeight: 72, textAlignVertical: 'top' }}
              testID="live-notes"
            />
          </Field>
          <Row $gap={8} $wrap>
            <AppButton
              variant="accent"
              disabled={!draft.date}
              onPress={() => {
                args.onSave(draft)
                args.onClose()
              }}
              testID="save-live-settings"
            >
              {t('live.saveSettings')}
            </AppButton>
            <AppButton variant="ghost" onPress={args.onClose} testID="close-live-settings">
              {t('summary.cancel')}
            </AppButton>
          </Row>
        </Stack>
      </Screen>
    </Dialog>
  )
}
