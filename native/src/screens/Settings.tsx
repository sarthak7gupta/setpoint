import { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { View } from 'react-native'
import { BackupExportDialog } from '../components/BackupExportDialog'
import { useApp } from '../context/AppContext'
import { applyBackup, createBackup } from '../db'
import type { CourtSurface, Format } from '../engine/types'
import { localeLabels, type LocaleSetting, surfaceTxKey } from '../i18n'
import { useT } from '../i18n/useT'
import { useLayout } from '../layout/useLayout'
import type { RootStackParamList } from '../navigation/types'
import { AppButton, Card, Field, Heading, Input, Screen, ScreenTopBar, SelectField, Stack, Sub, Title, TwoPane } from '../styles/ui'
import { themeLabels, themeOrder } from '../themes'
import { parseBackup, stringifyBackup, type SetPointBackup } from '../utils/backup'
import { pickBackupFile, shareBackupFile } from '../utils/backupIo'
import styled from 'styled-components/native'

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>

const TipText = styled.Text`
  color: ${(p) => p.theme.textMuted};
  font-size: 15px;
  line-height: 22px;
  font-family: ${(p) => p.theme.fontUi};
`

const ThemeGrid = styled.View<{ $columns: number }>`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`

const ThemeSlot = styled.View<{ $columns: number }>`
  flex-grow: 1;
  flex-basis: ${(p) => (p.$columns === 2 ? '48%' : '100%')};
`

export function Settings({ navigation }: Props) {
  const t = useT()
  const layout = useLayout()
  const { settings, setTheme, updateSettings, reloadSettings, settingsStatus, retrySettings } = useApp()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [pendingExport, setPendingExport] = useState<SetPointBackup | null>(null)

  const onExport = async () => {
    setBusy(true)
    setStatus(null)
    try {
      setPendingExport(await createBackup())
    } catch {
      setStatus(t('settings.exportFailed'))
    } finally {
      setBusy(false)
    }
  }

  const confirmExport = async (backup: SetPointBackup) => {
    setBusy(true)
    setStatus(null)
    try {
      await shareBackupFile({ json: stringifyBackup(backup), exportedAt: backup.exportedAt })
      setPendingExport(null)
      setStatus(t('settings.exportDone'))
    } catch {
      setStatus(t('settings.exportFailed'))
    } finally {
      setBusy(false)
    }
  }

  const onImport = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const raw = await pickBackupFile()
      if (raw === null) return
      const backup = parseBackup(raw)
      const result = await applyBackup(backup)
      await reloadSettings()
      setStatus(
        t('settings.importDone', {
          matches: result.summary.matches,
          players: result.summary.players,
        }) + (backup.skippedRecords ? ' ' + t('export.skipped', { count: backup.skippedRecords }) : ''),
      )
    } catch {
      setStatus(t('settings.importFailed'))
    } finally {
      setBusy(false)
    }
  }

  const themes = (
    <>
      <Heading>{t('settings.theme')}</Heading>
      <ThemeGrid $columns={layout.themeColumns} style={{ marginBottom: 24 }}>
        {themeOrder.map((id) => (
          <ThemeSlot key={id} $columns={layout.themeColumns}>
            <AppButton
              variant={settings.theme === id ? 'primary' : 'ghost'}
              onPress={() => void setTheme(id)}
            >
              {themeLabels[id]}
            </AppButton>
          </ThemeSlot>
        ))}
      </ThemeGrid>
    </>
  )

  const rest = (
    <>
      <Heading>{t('settings.language')}</Heading>
      <SelectField
        label={t('settings.language')}
        value={settings.locale}
        onChange={(value) => void updateSettings({ locale: value as LocaleSetting })}
        options={[
          { value: 'system', label: t('settings.languageSystem') },
          { value: 'en', label: localeLabels.en },
          { value: 'es', label: localeLabels.es },
          { value: 'fr', label: localeLabels.fr },
          { value: 'hi', label: localeLabels.hi },
        ]}
      />

      <Heading style={{ marginTop: 20 }}>{t('settings.haptics')}</Heading>
      <SelectField
        label={t('settings.haptics')}
        value={settings.hapticsEnabled ? 'on' : 'off'}
        onChange={(value) => void updateSettings({ hapticsEnabled: value === 'on' })}
        options={[
          { value: 'on', label: t('settings.hapticsOn') },
          { value: 'off', label: t('settings.hapticsOff') },
        ]}
      />

      <Heading style={{ marginTop: 20 }}>{t('settings.voice')}</Heading>
      <SelectField
        label={t('settings.voice')}
        value={settings.voiceCalloutsEnabled ? 'on' : 'off'}
        onChange={(value) => void updateSettings({ voiceCalloutsEnabled: value === 'on' })}
        options={[
          { value: 'on', label: t('settings.voiceOn') },
          { value: 'off', label: t('settings.voiceOff') },
        ]}
      />

      <Heading style={{ marginTop: 20 }}>{t('settings.voiceCommands')}</Heading>
      <SelectField
        label={t('settings.voiceCommands')}
        value={settings.voiceCommandsEnabled ? 'on' : 'off'}
        onChange={(value) => void updateSettings({ voiceCommandsEnabled: value === 'on' })}
        options={[
          { value: 'on', label: t('settings.voiceCommandsOn') },
          { value: 'off', label: t('settings.voiceCommandsOff') },
        ]}
      />
      <TipText style={{ marginTop: 8, marginBottom: 4 }}>{t('live.voiceHint')}</TipText>
      <TipText>{t('live.voiceNeedBuild')}</TipText>

      <Heading style={{ marginTop: 20 }}>{t('settings.defaults')}</Heading>
      <Stack $gap={14}>
        <SelectField
          label={t('settings.format')}
          value={settings.defaultFormat}
          onChange={(value) => void updateSettings({ defaultFormat: value as Format })}
          options={[
            { value: 'singles', label: t('format.singles') },
            { value: 'doubles', label: t('format.doubles') },
          ]}
        />
        <SelectField
          label={t('settings.bestOf')}
          value={settings.defaultBestOf}
          onChange={(value) => void updateSettings({ defaultBestOf: value as 1 | 3 | 5 })}
          options={[
            { value: 1, label: '1' },
            { value: 3, label: '3' },
            { value: 5, label: '5' },
          ]}
        />
        <SelectField
          label={t('settings.tiebreakPoints')}
          value={settings.defaultTiebreakPoints}
          onChange={(value) => void updateSettings({ defaultTiebreakPoints: value })}
          options={[
            { value: 5, label: '5' },
            { value: 7, label: '7' },
            { value: 10, label: '10' },
          ]}
        />
        <SelectField
          label={t('settings.finalSetTb')}
          value={settings.defaultFinalSetTiebreak ? 'yes' : 'no'}
          onChange={(value) => void updateSettings({ defaultFinalSetTiebreak: value === 'yes' })}
          options={[
            { value: 'yes', label: t('settings.yes') },
            { value: 'no', label: t('settings.advantageSet') },
          ]}
        />
        <SelectField
          label={t('settings.finalSetTbPoints')}
          value={settings.defaultFinalSetTiebreakPoints}
          onChange={(value) => void updateSettings({ defaultFinalSetTiebreakPoints: value })}
          options={[
            { value: 7, label: '7' },
            { value: 10, label: '10' },
          ]}
        />
        <SelectField
          label={t('settings.noAd')}
          value={settings.defaultNoAdScoring ? 'on' : 'off'}
          onChange={(value) => void updateSettings({ defaultNoAdScoring: value === 'on' })}
          options={[
            { value: 'off', label: t('new.noAdOff') },
            { value: 'on', label: t('new.noAdOn') },
          ]}
        />
        <TipText>{t('settings.timerHint')}</TipText>
        <SelectField
          label={t('settings.surface')}
          value={settings.defaultCourtSurface}
          onChange={(value) => void updateSettings({ defaultCourtSurface: value as CourtSurface })}
          options={[
            { value: 'hard', label: t(surfaceTxKey('hard')) },
            { value: 'concrete', label: t(surfaceTxKey('concrete')) },
            { value: 'clay', label: t(surfaceTxKey('clay')) },
            { value: 'grass', label: t(surfaceTxKey('grass')) },
            { value: 'carpet', label: t(surfaceTxKey('carpet')) },
            { value: 'indoor', label: t(surfaceTxKey('indoor')) },
          ]}
        />
        <Field label={t('settings.weather')}>
          <Input
            value={settings.defaultWeather}
            onChangeText={(value) => void updateSettings({ defaultWeather: value })}
            placeholder={t('settings.weatherPlaceholder')}
          />
        </Field>
        <Field label={t('settings.breakSec')}>
          <Input
            keyboardType="number-pad"
            value={String(settings.defaultBreakSeconds)}
            onChangeText={(value) =>
              void updateSettings({ defaultBreakSeconds: Number(value) || 0 })
            }
          />
        </Field>
        <Field label={t('settings.changeoverSec')}>
          <Input
            keyboardType="number-pad"
            value={String(settings.defaultChangeoverSeconds)}
            onChangeText={(value) =>
              void updateSettings({ defaultChangeoverSeconds: Number(value) || 0 })
            }
          />
        </Field>
        <SelectField
          label={t('settings.warmupOnStart')}
          value={settings.defaultWarmupEnabled ? 'on' : 'off'}
          onChange={(value) => void updateSettings({ defaultWarmupEnabled: value === 'on' })}
          options={[
            { value: 'on', label: t('settings.on') },
            { value: 'off', label: t('settings.off') },
          ]}
        />
        {settings.defaultWarmupEnabled && (
          <Field label={t('settings.warmupSec')}>
            <Input
              keyboardType="number-pad"
              value={String(settings.defaultWarmupSeconds)}
              onChangeText={(value) =>
                void updateSettings({ defaultWarmupSeconds: Number(value) || 0 })
              }
            />
          </Field>
        )}
        <SelectField
          label={t('settings.ballChange')}
          value={settings.defaultBallChangeEnabled ? 'on' : 'off'}
          onChange={(value) => void updateSettings({ defaultBallChangeEnabled: value === 'on' })}
          options={[
            { value: 'on', label: t('settings.on') },
            { value: 'off', label: t('settings.off') },
          ]}
        />
        {settings.defaultBallChangeEnabled && (
          <>
            <Field label={t('settings.ballFirst')}>
              <Input
                keyboardType="number-pad"
                value={String(settings.defaultBallChangeFirstGames)}
                onChangeText={(value) =>
                  void updateSettings({ defaultBallChangeFirstGames: Number(value) || 1 })
                }
              />
            </Field>
            <Field label={t('settings.ballEvery')}>
              <Input
                keyboardType="number-pad"
                value={String(settings.defaultBallChangeEveryGames)}
                onChangeText={(value) =>
                  void updateSettings({ defaultBallChangeEveryGames: Number(value) || 1 })
                }
              />
            </Field>
            <Field label={t('settings.ballSec')}>
              <Input
                keyboardType="number-pad"
                value={String(settings.defaultBallChangeSeconds)}
                onChangeText={(value) =>
                  void updateSettings({ defaultBallChangeSeconds: Number(value) || 0 })
                }
              />
            </Field>
          </>
        )}
      </Stack>

      <Card style={{ marginTop: 28 }}>
        <Heading>{t('settings.data')}</Heading>
        <TipText>{t('settings.dataTip')}</TipText>
        <Stack $gap={8} style={{ marginTop: 12 }}>
          <AppButton
            variant="primary"
            disabled={busy}
            testID="export-backup"
            onPress={() => void onExport()}
          >
            {t('settings.export')}
          </AppButton>
          <AppButton
            variant="ghost"
            disabled={busy}
            testID="import-backup"
            onPress={() => void onImport()}
          >
            {t('settings.import')}
          </AppButton>
        </Stack>
        {status ? (
          <TipText testID="backup-status" style={{ marginTop: 10 }}>
            {status}
          </TipText>
        ) : null}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Heading>{t('settings.device')}</Heading>
        <TipText>{t('settings.deviceTip')}</TipText>
      </Card>
    </>
  )

  return (
    <Screen keyboard>
      <ScreenTopBar
        label={t('common.home')}
        onPress={() => navigation.navigate('Home')}
        testID="screen-home"
      />
      <Title>{t('settings.title')}</Title>
      <Sub>{t('settings.sub')}</Sub>
      {settingsStatus === 'error' && <><TipText>{t('common.saveFailed')}</TipText><AppButton onPress={() => void retrySettings()}>{t('common.retry')}</AppButton></>}
      {settingsStatus === 'saving' && <TipText>{t('common.saving')}</TipText>}
      {layout.twoPane ? (
        <TwoPane a={<View>{themes}</View>} b={<View>{rest}</View>} />
      ) : (
        <>
          {themes}
          {rest}
        </>
      )}
      {pendingExport ? (
        <BackupExportDialog
          backup={pendingExport}
          busy={busy}
          onCancel={() => setPendingExport(null)}
          onConfirm={(backup) => void confirmExport(backup)}
        />
      ) : null}
    </Screen>
  )
}
