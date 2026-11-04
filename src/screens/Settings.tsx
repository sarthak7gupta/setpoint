import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BackupExportDialog } from '../components/BackupExportDialog'
import { useApp } from '../context/AppContext'
import { applyBackup, createBackup } from '../db'
import type { CourtSurface, Format } from '../engine/types'
import { type LocaleSetting, localeLabels, surfaceTxKey } from '../i18n'
import { useT } from '../i18n/useT'
import { useLayout } from '../layout/useLayout'
import { Button, Field, Page, Row, ScreenTopBar, Stack, Sub, TwoPane } from '../styles/ui'
import {
  type DesignStyleId,
  designStyleDescriptions,
  designStyleLabels,
  designStyleOrder,
  themeLabels,
  themeOrder,
} from '../themes'
import { backupFileName, parseBackup, type SetPointBackup, stringifyBackup } from '../utils/backup'

export function Settings() {
  const t = useT()
  const layout = useLayout()
  const { settings, setTheme, updateSettings, reloadSettings, settingsStatus, retrySettings } =
    useApp()
  const fileRef = useRef<HTMLInputElement>(null)
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
      const filename = backupFileName(backup.exportedAt)
      const json = stringifyBackup(backup)
      const file = new File([json], filename, { type: 'application/json' })
      try {
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename })
          setPendingExport(null)
          setStatus(t('settings.exportDone'))
          return
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setPendingExport(null)
      setStatus(t('settings.exportDone'))
    } catch {
      setStatus(t('settings.exportFailed'))
    } finally {
      setBusy(false)
    }
  }

  const onPickImport = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setStatus(null)
    try {
      const backup = parseBackup(await file.text())
      const result = await applyBackup(backup)
      await reloadSettings()
      setStatus(
        t('settings.importDone', {
          matches: result.summary.matches,
          players: result.summary.players,
        }) +
          (backup.skippedRecords
            ? ' ' + t('export.skipped', { count: backup.skippedRecords })
            : ''),
      )
    } catch {
      setStatus(t('settings.importFailed'))
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const currentStyle: DesignStyleId = settings.designStyle ?? 'classic'

  const themes = (
    <>
      <h3 style={{ fontSize: '1.4rem', marginBottom: '0.65rem' }}>{t('settings.theme')}</h3>

      <div
        style={{
          fontSize: '0.78rem',
          fontWeight: 800,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '0.45rem',
        }}
      >
        Design Style (1 Classic + 5 Modern)
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
          gap: '0.45rem',
          marginBottom: '1.25rem',
        }}
      >
        {designStyleOrder.map((styleId) => (
          <Button
            key={styleId}
            type="button"
            $variant={currentStyle === styleId ? 'primary' : 'ghost'}
            style={{
              textAlign: 'center',
              fontSize: '0.82rem',
              padding: '0.65rem 0.5rem',
              lineHeight: 1.2,
            }}
            title={designStyleDescriptions[styleId]}
            onClick={() => void updateSettings({ designStyle: styleId })}
          >
            {designStyleLabels[styleId]}
          </Button>
        ))}
      </div>

      <div
        style={{
          fontSize: '0.78rem',
          fontWeight: 800,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '0.45rem',
        }}
      >
        Tournament Atmosphere (4 Slams)
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${layout.themeColumns}, 1fr)`,
          gap: '0.5rem',
          marginBottom: '1.5rem',
        }}
      >
        {themeOrder.map((id) => (
          <Button
            key={id}
            type="button"
            $variant={settings.theme === id ? 'primary' : 'ghost'}
            onClick={() => void setTheme(id)}
          >
            {themeLabels[id]}
          </Button>
        ))}
      </div>
    </>
  )

  const rest = (
    <>
      <h3 style={{ fontSize: '1.4rem', marginBottom: '0.65rem' }}>{t('settings.language')}</h3>
      <Field style={{ marginBottom: '1.5rem' }}>
        {t('settings.language')}
        <select
          value={settings.locale}
          onChange={(e) => void updateSettings({ locale: e.target.value as LocaleSetting })}
        >
          <option value="system">{t('settings.languageSystem')}</option>
          <option value="en">{localeLabels.en}</option>
          <option value="es">{localeLabels.es}</option>
          <option value="fr">{localeLabels.fr}</option>
          <option value="hi">{localeLabels.hi}</option>
        </select>
      </Field>

      <h3 style={{ fontSize: '1.4rem', marginBottom: '0.65rem' }}>{t('settings.voice')}</h3>
      <Field style={{ marginBottom: '0.75rem' }}>
        {t('settings.voice')}
        <select
          value={settings.voiceCalloutsEnabled ? 'on' : 'off'}
          onChange={(e) => void updateSettings({ voiceCalloutsEnabled: e.target.value === 'on' })}
        >
          <option value="on">{t('settings.voiceOn')}</option>
          <option value="off">{t('settings.voiceOff')}</option>
        </select>
      </Field>
      <Field style={{ marginBottom: '0.5rem' }}>
        {t('settings.voiceCommands')}
        <select
          value={settings.voiceCommandsEnabled ? 'on' : 'off'}
          onChange={(e) => void updateSettings({ voiceCommandsEnabled: e.target.value === 'on' })}
        >
          <option value="on">{t('settings.voiceCommandsOn')}</option>
          <option value="off">{t('settings.voiceCommandsOff')}</option>
        </select>
      </Field>
      <p
        style={{
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          marginTop: 0,
          marginBottom: '1.5rem',
        }}
      >
        {t('live.voiceHint')}
      </p>

      <h3 style={{ fontSize: '1.4rem', marginBottom: '0.65rem' }}>{t('settings.defaults')}</h3>
      <Stack $gap="0.85rem">
        <Field>
          {t('settings.format')}
          <select
            value={settings.defaultFormat}
            onChange={(e) => void updateSettings({ defaultFormat: e.target.value as Format })}
          >
            <option value="singles">{t('format.singles')}</option>
            <option value="doubles">{t('format.doubles')}</option>
          </select>
        </Field>
        <Field>
          {t('settings.bestOf')}
          <select
            value={settings.defaultBestOf}
            onChange={(e) =>
              void updateSettings({ defaultBestOf: Number(e.target.value) as 1 | 3 | 5 })
            }
          >
            <option value={1}>1</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
          </select>
        </Field>
        <Field>
          {t('settings.tiebreakPoints')}
          <select
            value={settings.defaultTiebreakPoints}
            onChange={(e) => void updateSettings({ defaultTiebreakPoints: Number(e.target.value) })}
          >
            <option value={5}>5</option>
            <option value={7}>7</option>
            <option value={10}>10</option>
          </select>
        </Field>
        <Field>
          {t('settings.finalSetTb')}
          <select
            value={settings.defaultFinalSetTiebreak ? 'yes' : 'no'}
            onChange={(e) =>
              void updateSettings({ defaultFinalSetTiebreak: e.target.value === 'yes' })
            }
          >
            <option value="yes">{t('settings.yes')}</option>
            <option value="no">{t('settings.advantageSet')}</option>
          </select>
        </Field>
        <Field>
          {t('settings.finalSetTbPoints')}
          <select
            value={settings.defaultFinalSetTiebreakPoints}
            onChange={(e) =>
              void updateSettings({ defaultFinalSetTiebreakPoints: Number(e.target.value) })
            }
          >
            <option value={7}>7</option>
            <option value={10}>10</option>
          </select>
        </Field>
        <Field>
          {t('settings.noAd')}
          <select
            value={settings.defaultNoAdScoring ? 'on' : 'off'}
            onChange={(e) => void updateSettings({ defaultNoAdScoring: e.target.value === 'on' })}
          >
            <option value="off">{t('new.noAdOff')}</option>
            <option value="on">{t('new.noAdOn')}</option>
          </select>
        </Field>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
          {t('settings.timerHint')}
        </p>
        <Field>
          {t('settings.surface')}
          <select
            value={settings.defaultCourtSurface}
            onChange={(e) =>
              void updateSettings({ defaultCourtSurface: e.target.value as CourtSurface })
            }
          >
            {(['hard', 'concrete', 'clay', 'grass', 'carpet', 'indoor'] as CourtSurface[]).map(
              (surface) => (
                <option key={surface} value={surface}>
                  {t(surfaceTxKey(surface))}
                </option>
              ),
            )}
          </select>
        </Field>
        <Field>
          {t('settings.weather')}
          <input
            value={settings.defaultWeather}
            onChange={(e) => void updateSettings({ defaultWeather: e.target.value })}
            placeholder={t('settings.weatherPlaceholder')}
          />
        </Field>
        <Field>
          {t('settings.breakSec')}
          <input
            type="number"
            value={settings.defaultBreakSeconds}
            onChange={(e) => void updateSettings({ defaultBreakSeconds: Number(e.target.value) })}
          />
        </Field>
        <Field>
          {t('settings.changeoverSec')}
          <input
            type="number"
            value={settings.defaultChangeoverSeconds}
            onChange={(e) =>
              void updateSettings({ defaultChangeoverSeconds: Number(e.target.value) })
            }
          />
        </Field>
        <Field>
          {t('settings.warmupOnStart')}
          <select
            value={settings.defaultWarmupEnabled ? 'on' : 'off'}
            onChange={(e) => void updateSettings({ defaultWarmupEnabled: e.target.value === 'on' })}
          >
            <option value="on">{t('settings.on')}</option>
            <option value="off">{t('settings.off')}</option>
          </select>
        </Field>
        {settings.defaultWarmupEnabled && (
          <Field>
            {t('settings.warmupSec')}
            <input
              type="number"
              value={settings.defaultWarmupSeconds}
              onChange={(e) =>
                void updateSettings({ defaultWarmupSeconds: Number(e.target.value) })
              }
            />
          </Field>
        )}
        <Field>
          {t('settings.ballChange')}
          <select
            value={settings.defaultBallChangeEnabled ? 'on' : 'off'}
            onChange={(e) =>
              void updateSettings({ defaultBallChangeEnabled: e.target.value === 'on' })
            }
          >
            <option value="on">{t('settings.on')}</option>
            <option value="off">{t('settings.off')}</option>
          </select>
        </Field>
        {settings.defaultBallChangeEnabled && (
          <>
            <Field>
              {t('settings.ballFirst')}
              <input
                type="number"
                min={1}
                value={settings.defaultBallChangeFirstGames}
                onChange={(e) =>
                  void updateSettings({ defaultBallChangeFirstGames: Number(e.target.value) })
                }
              />
            </Field>
            <Field>
              {t('settings.ballEvery')}
              <input
                type="number"
                min={1}
                value={settings.defaultBallChangeEveryGames}
                onChange={(e) =>
                  void updateSettings({ defaultBallChangeEveryGames: Number(e.target.value) })
                }
              />
            </Field>
            <Field>
              {t('settings.ballSec')}
              <input
                type="number"
                value={settings.defaultBallChangeSeconds}
                onChange={(e) =>
                  void updateSettings({ defaultBallChangeSeconds: Number(e.target.value) })
                }
              />
            </Field>
          </>
        )}
      </Stack>

      <div
        style={{
          marginTop: '1.75rem',
          padding: '1rem',
          borderRadius: 14,
          border: '1px solid var(--line)',
          background: 'rgba(0,0,0,0.25)',
        }}
      >
        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>{t('settings.data')}</h3>
        <p
          style={{
            color: 'var(--text-muted)',
            margin: '0 0 0.85rem',
            fontSize: '0.95rem',
            lineHeight: 1.45,
          }}
        >
          {t('settings.dataTip')}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          data-testid="import-backup-file"
          onChange={(event) => void onPickImport(event.target.files?.[0])}
        />
        <Row $gap="0.5rem" style={{ justifyContent: 'flex-start' }}>
          <Button
            type="button"
            $variant="primary"
            disabled={busy}
            data-testid="export-backup"
            onClick={() => void onExport()}
          >
            {t('settings.export')}
          </Button>
          <Button
            type="button"
            $variant="ghost"
            disabled={busy}
            data-testid="import-backup"
            onClick={() => fileRef.current?.click()}
          >
            {t('settings.import')}
          </Button>
        </Row>
        {status && (
          <p
            data-testid="backup-status"
            style={{ color: 'var(--text-muted)', margin: '0.75rem 0 0', fontSize: '0.9rem' }}
          >
            {status}
          </p>
        )}
      </div>

      <div
        style={{
          marginTop: '1.75rem',
          padding: '1rem',
          borderRadius: 14,
          border: '1px solid var(--line)',
          background: 'rgba(0,0,0,0.25)',
        }}
      >
        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>{t('settings.device')}</h3>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem', lineHeight: 1.45 }}>
          {t('settings.deviceTip')}
        </p>
      </div>
    </>
  )

  return (
    <Page>
      <ScreenTopBar>
        <Button as={Link} to="/app" $variant="ghost" style={{ textDecoration: 'none' }}>
          {t('common.home')}
        </Button>
      </ScreenTopBar>
      <h2 style={{ fontSize: '2.4rem' }}>{t('settings.title')}</h2>
      <Sub>{t('settings.sub')}</Sub>
      {settingsStatus === 'error' && (
        <div role="alert">
          <p>{t('common.saveFailed')}</p>
          <Button onClick={() => void retrySettings()}>{t('common.retry')}</Button>
        </div>
      )}
      {settingsStatus === 'saving' && <p role="status">{t('common.saving')}</p>}

      {layout.twoPane ? (
        <TwoPane a={themes} b={rest} />
      ) : (
        <>
          {themes}
          {rest}
        </>
      )}

      {pendingExport && (
        <BackupExportDialog
          backup={pendingExport}
          busy={busy}
          onCancel={() => setPendingExport(null)}
          onConfirm={(backup) => void confirmExport(backup)}
        />
      )}
    </Page>
  )
}
