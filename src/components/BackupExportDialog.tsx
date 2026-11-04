import { useMemo, useState } from 'react'
import { validDateRange } from '../../shared/utils/historyFilters'
import type { Format } from '../engine/types'
import { useT } from '../i18n/useT'
import { Button, Field, Overlay, OverlayCard, Row } from '../styles/ui'
import {
  backupMatchDate,
  backupMatchLabel,
  backupPlayerNames,
  filterBackupMatches,
  type SetPointBackup,
  sliceBackup,
} from '../utils/backup'

export function BackupExportDialog(args: {
  backup: SetPointBackup
  busy: boolean
  onCancel: () => void
  onConfirm: (backup: SetPointBackup) => void
}) {
  const t = useT()
  const { backup, busy, onCancel, onConfirm } = args
  const [playerNames, setPlayerNames] = useState<Set<string>>(() => new Set())
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [format, setFormat] = useState<Format | ''>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(backup.matches.map((m) => m.id)),
  )
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
    <Overlay
      onDismiss={busy ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={t('settings.exportTitle')}
      data-testid="export-backup-dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <OverlayCard $wide>
        <h2>{t('settings.exportTitle')}</h2>
        <p>{t('settings.exportBody')}</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.65rem',
            marginBottom: '0.75rem',
          }}
        >
          <fieldset style={{ border: 0, padding: 0, margin: 0, gridColumn: '1 / -1' }}>
            <legend>{t('settings.exportPlayer')}</legend>
            <span
              style={{
                display: 'block',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 400,
                marginBottom: '0.35rem',
                textTransform: 'none',
                letterSpacing: 'normal',
              }}
            >
              {t('settings.exportPlayerHint')}
            </span>
            <div
              data-testid="export-filter-player"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.4rem',
                maxHeight: '7.5rem',
                overflow: 'auto',
                padding: '0.35rem 0',
              }}
            >
              {players.length === 0 && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {t('settings.exportPlayerAll')}
                </span>
              )}
              {players.map((name) => {
                const on = playerNames.has(name)
                return (
                  <label
                    key={name}
                    data-testid={`export-player-${name}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.55rem',
                      borderRadius: 8,
                      border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                      background: on ? 'rgba(204, 255, 0, 0.12)' : 'rgba(0,0,0,0.22)',
                      textTransform: 'none',
                      letterSpacing: 'normal',
                      color: 'var(--text)',
                      fontSize: '0.9rem',
                      cursor: busy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={busy}
                      onChange={() => togglePlayer(name)}
                    />
                    {name}
                  </label>
                )
              })}
            </div>
            {playerNames.size > 0 && (
              <Button
                type="button"
                $variant="ghost"
                disabled={busy}
                data-testid="export-clear-players"
                style={{ marginTop: '0.35rem', alignSelf: 'flex-start' }}
                onClick={() => setPlayerNames(new Set())}
              >
                {t('settings.exportPlayerClear')}
              </Button>
            )}
          </fieldset>
          <Field>
            {t('settings.exportFormat')}
            <select
              data-testid="export-filter-format"
              value={format}
              onChange={(event) => setFormat(event.target.value as Format | '')}
            >
              <option value="">{t('settings.exportFormatAll')}</option>
              <option value="singles">{t('format.singles')}</option>
              <option value="doubles">{t('format.doubles')}</option>
            </select>
          </Field>
          <Field>
            {t('settings.exportFrom')}
            <input
              type="date"
              data-testid="export-filter-from"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </Field>
          <Field>
            {t('settings.exportTo')}
            <input
              type="date"
              data-testid="export-filter-to"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </Field>
        </div>
        <Row $gap="0.5rem" style={{ marginBottom: '0.65rem' }}>
          <Button
            type="button"
            $variant="ghost"
            disabled={busy || visibleMatches.length === 0}
            data-testid="export-select-all"
            onClick={() =>
              setSelectedIds(
                (current) => new Set([...current, ...visibleMatches.map((match) => match.id)]),
              )
            }
          >
            {t('settings.exportAll')}
          </Button>
          <Button
            type="button"
            $variant="ghost"
            disabled={busy || selectedCount === 0}
            data-testid="export-select-none"
            onClick={() =>
              setSelectedIds(
                (current) =>
                  new Set([...current].filter((id) => !visibleMatches.some((m) => m.id === id))),
              )
            }
          >
            {t('settings.exportNone')}
          </Button>
        </Row>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            maxHeight: '12rem',
            overflow: 'auto',
            marginBottom: '0.85rem',
          }}
        >
          {visibleMatches.length === 0 && (
            <p style={{ margin: 0 }} data-testid="export-empty">
              {t('settings.exportEmpty')}
            </p>
          )}
          {visibleMatches.map((match) => {
            const checked = selectedIds.has(match.id)
            const date = backupMatchDate(match)
            return (
              <label
                key={match.id}
                data-testid={`export-match-${match.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.55rem',
                  padding: '0.55rem 0.65rem',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  background: 'rgba(0,0,0,0.22)',
                  textTransform: 'none',
                  letterSpacing: 'normal',
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                  cursor: busy ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={busy}
                  onChange={() => toggleMatch(match.id)}
                />
                <span>
                  <strong>{backupMatchLabel(match)}</strong>
                  <span
                    style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem' }}
                  >
                    {date || t('settings.exportNoDate')}
                    {' · '}
                    {t(match.state.isComplete ? 'home.final' : 'home.inProgress')}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            color: 'var(--text)',
            textTransform: 'none',
            letterSpacing: 'normal',
            fontSize: '0.95rem',
          }}
        >
          <input
            type="checkbox"
            data-testid="export-include-settings"
            checked={includeSettings}
            disabled={busy}
            onChange={(event) => setIncludeSettings(event.target.checked)}
          />
          {t('settings.exportSettings')}
        </label>
        <p role="status">
          {t('export.selection', { selected: selectedCount, visible: visibleMatches.length })}
        </p>
        {!datesValid && <p role="alert">{t('export.dateError')}</p>}
        <Row $gap="0.5rem" style={{ justifyContent: 'flex-end' }}>
          <Button
            type="button"
            $variant="ghost"
            disabled={busy}
            data-testid="cancel-export-backup"
            onClick={onCancel}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            $variant="primary"
            disabled={busy || !canExport}
            data-testid="confirm-export-backup"
            onClick={() =>
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
          </Button>
        </Row>
      </OverlayCard>
    </Overlay>
  )
}
