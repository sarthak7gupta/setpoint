import { Dialog } from './Dialog'
import { validDateRange } from '../../../shared/utils/historyFilters'
import { useMemo, useState, type ReactNode } from 'react'
import { ScrollView, useWindowDimensions, View } from 'react-native'
import type { Format } from '../engine/types'
import { useT } from '../i18n/useT'
import {
  AppButton,
  Field,
  FeedbackPressable,
  FieldLabel,
  Heading,
  Input,
  OverlaySub,
  Row,
  SelectField,
  Stack,
  Surface,
} from '../styles/ui'
import {
  backupMatchDate,
  backupMatchLabel,
  backupPlayerNames,
  filterBackupMatches,
  sliceBackup,
  type SetPointBackup,
} from '../utils/backup'
import styled from 'styled-components/native'

const Backdrop = styled.Pressable`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.72);
  justify-content: center;
  padding: 16px;
`

function Sheet(args: {
  children: ReactNode
  style?: object
  testID?: string
  onStartShouldSetResponder?: () => boolean
}) {
  return (
    <Surface
      level="sheet"
      outlined={false}
      testID={args.testID}
      onStartShouldSetResponder={args.onStartShouldSetResponder}
      style={[{ width: '100%', maxWidth: 560, alignSelf: 'center', padding: 18 }, args.style]}
    >
      {args.children}
    </Surface>
  )
}

const MatchRow = styled(FeedbackPressable)<{ $on: boolean }>`
  flex-direction: row;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border-width: 1px;
  border-color: ${(p) => p.theme.line};
  background-color: ${(p) => (p.$on ? 'rgba(204, 255, 0, 0.1)' : 'rgba(0, 0, 0, 0.22)')};
`

const PlayerChip = styled(FeedbackPressable)<{ $on: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  border-width: 1px;
  border-color: ${(p) => (p.$on ? p.theme.accent : p.theme.line)};
  background-color: ${(p) => (p.$on ? 'rgba(204, 255, 0, 0.12)' : 'rgba(0, 0, 0, 0.22)')};
`

const PlayerChipText = styled.Text<{ $on: boolean }>`
  color: ${(p) => p.theme.text};
  font-size: 14px;
  font-family: ${(p) => p.theme.fontUi};
`

const Check = styled.Text`
  color: ${(p) => p.theme.accent};
  font-size: 16px;
  line-height: 22px;
  width: 18px;
  font-family: ${(p) => p.theme.fontUiBold};
`

const MatchName = styled.Text`
  color: ${(p) => p.theme.text};
  font-size: 16px;
  font-family: ${(p) => p.theme.fontUiSemiBold};
`

const MatchMeta = styled.Text`
  color: ${(p) => p.theme.textMuted};
  font-size: 13px;
  margin-top: 2px;
  font-family: ${(p) => p.theme.fontUi};
`

const SettingsLabel = styled.Text`
  color: ${(p) => p.theme.text};
  font-size: 15px;
  flex: 1;
  font-family: ${(p) => p.theme.fontUi};
`

const SettingsRow = styled(FeedbackPressable)`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 8px 0 12px;
`

export function BackupExportDialog(args: {
  backup: SetPointBackup
  busy: boolean
  onCancel: () => void
  onConfirm: (backup: SetPointBackup) => void
}) {
  const t = useT()
  const { height } = useWindowDimensions()
  const { backup, busy, onCancel, onConfirm } = args
  const [playerNames, setPlayerNames] = useState<Set<string>>(() => new Set())
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [format, setFormat] = useState<Format | ''>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(backup.matches.map(m => m.id)))
  const [includeSettings, setIncludeSettings] = useState(true)

  const players = useMemo(() => backupPlayerNames(backup.matches), [backup.matches])
  const selectedPlayerList = useMemo(() => [...playerNames], [playerNames])
  const visibleMatches = useMemo(
    () =>
      filterBackupMatches({
        matches: backup.matches,
        playerNames: selectedPlayerList,
        fromDate,
        toDate,
        format,
      }),
    [backup.matches, selectedPlayerList, fromDate, toDate, format],
  )



  const selectedCount = visibleMatches.reduce(
    (count, match) => count + (selectedIds.has(match.id) ? 1 : 0),
    0,
  )
  const datesValid = validDateRange(fromDate, toDate)
  const canExport = datesValid && (selectedCount > 0 || includeSettings)

  const toggleMatch = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePlayer = (name: string) => {
    setPlayerNames((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <Dialog
      visible
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={() => {
        if (!busy) onCancel()
      }}
    >
      <Backdrop onPress={() => !busy && onCancel()}>
        <Sheet
          style={{ maxHeight: height * 0.9 }}
          testID="export-backup-dialog"
          onStartShouldSetResponder={() => true}
        >
          <Heading>{t('settings.exportTitle')}</Heading>
          <OverlaySub style={{ textAlign: 'left' }}>{t('settings.exportBody')}</OverlaySub>
          <ScrollView
            style={{ maxHeight: height * 0.62 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <Stack $gap={10}>
              <View testID="export-filter-player">
                <FieldLabel>{t('settings.exportPlayer')}</FieldLabel>
                <OverlaySub style={{ textAlign: 'left', marginBottom: 8, marginTop: 2 }}>
                  {t('settings.exportPlayerHint')}
                </OverlaySub>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {players.map((name) => {
                    const on = playerNames.has(name)
                    return (
                      <PlayerChip
                        key={name}
                        $on={on}
                        disabled={busy}
                        testID={`export-player-${name}`}
                        onPress={() => togglePlayer(name)}
                      >
                        <Check>{on ? '✓' : ''}</Check>
                        <PlayerChipText $on={on}>{name}</PlayerChipText>
                      </PlayerChip>
                    )
                  })}
                </View>
                {playerNames.size > 0 && (
                  <AppButton
                    variant="ghost"
                    disabled={busy}
                    testID="export-clear-players"
                    onPress={() => setPlayerNames(new Set())}
                    style={{ alignSelf: 'flex-start', marginTop: 8 }}
                  >
                    {t('settings.exportPlayerClear')}
                  </AppButton>
                )}
              </View>
              <SelectField
                label={t('settings.exportFormat')}
                testID="export-filter-format"
                value={format}
                onChange={setFormat}
                options={[
                  { value: '', label: t('settings.exportFormatAll') },
                  { value: 'singles', label: t('format.singles') },
                  { value: 'doubles', label: t('format.doubles') },
                ]}
              />
              <Field label={t('settings.exportFrom')}>
                <Input
                  testID="export-filter-from"
                  value={fromDate}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                  onChangeText={setFromDate}
                />
              </Field>
              <Field label={t('settings.exportTo')}>
                <Input
                  testID="export-filter-to"
                  value={toDate}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                  onChangeText={setToDate}
                />
              </Field>
              <OverlaySub accessibilityLiveRegion="polite">{t('export.selection', { selected: selectedCount, visible: visibleMatches.length })}</OverlaySub>
            {!datesValid && <OverlaySub accessibilityRole="alert">{t('export.dateError')}</OverlaySub>}
            <Row $gap={8}>
                <AppButton
                  variant="ghost"
                  disabled={busy || visibleMatches.length === 0}
                  testID="export-select-all"
                  onPress={() =>
                    setSelectedIds(current => new Set([...current, ...visibleMatches.map(match => match.id)]))
                  }
                >
                  {t('settings.exportAll')}
                </AppButton>
                <AppButton
                  variant="ghost"
                  disabled={busy || selectedCount === 0}
                  testID="export-select-none"
                  onPress={() => setSelectedIds(current => new Set([...current].filter(id => !visibleMatches.some(m => m.id === id))))}
                >
                  {t('settings.exportNone')}
                </AppButton>
              </Row>
              {visibleMatches.length === 0 ? (
                <OverlaySub testID="export-empty" style={{ textAlign: 'left', marginBottom: 0 }}>
                  {t('settings.exportEmpty')}
                </OverlaySub>
              ) : (
                visibleMatches.map((match) => {
                  const on = selectedIds.has(match.id)
                  const date = backupMatchDate(match)
                  return (
                    <MatchRow
                      key={match.id}
                      $on={on}
                      disabled={busy}
                      testID={`export-match-${match.id}`}
                      onPress={() => toggleMatch(match.id)}
                    >
                      <Check>{on ? '✓' : ''}</Check>
                      <View style={{ flex: 1 }}>
                        <MatchName>{backupMatchLabel(match)}</MatchName>
                        <MatchMeta>
                          {date || t('settings.exportNoDate')}
                          {match.state.isComplete
                            ? ` · ${t('home.final')}`
                            : ` · ${t('home.inProgress')}`}
                        </MatchMeta>
                      </View>
                    </MatchRow>
                  )
                })
              )}
            </Stack>
          </ScrollView>
          <SettingsRow
            disabled={busy}
            testID="export-include-settings"
            onPress={() => setIncludeSettings((current) => !current)}
          >
            <Check>{includeSettings ? '✓' : ''}</Check>
            <SettingsLabel>{t('settings.exportSettings')}</SettingsLabel>
          </SettingsRow>
          <Row $gap={8} style={{ justifyContent: 'flex-end' }}>
            <AppButton
              variant="ghost"
              disabled={busy}
              testID="cancel-export-backup"
              onPress={onCancel}
            >
              {t('common.cancel')}
            </AppButton>
            <AppButton
              variant="primary"
              disabled={busy || !canExport}
              testID="confirm-export-backup"
              onPress={() =>
                onConfirm(
                  sliceBackup({
                    backup,
                    matchIds: visibleMatches
                      .filter((match) => selectedIds.has(match.id))
                      .map((match) => match.id),
                    includeSettings,
                  }),
                )
              }
            >
              {t('settings.exportCount', { count: selectedCount })}
            </AppButton>
          </Row>
        </Sheet>
      </Backdrop>
    </Dialog>
  )
}
