/**
 * Mid-match editor for timers and court details. Scoring rules stay locked.
 * Walkover is also available under End match (and directly from More).
 */
import { useState } from 'react'
import styled from 'styled-components'
import type { CourtSurface, MatchState, Side, TimeOfDay } from '../engine'
import { useT } from '../i18n/useT'
import { Button, Field, Page, Row, Stack } from '../styles/ui'
import { type LiveMatchSettings, liveMatchSettingsFrom } from '../utils/matchMetadata'
import { Dialog } from './Dialog'

const Shell = styled(Dialog)`
  position: fixed;
  inset: 0;
  z-index: 90;
  overflow: auto;
  background: var(--gradient, var(--bg-deep));
  padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
`

const Top = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.75rem;
`

const Heading = styled.h3`
  font-size: 1.05rem;
  margin: 0.35rem 0 0;
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
    <Shell
      onDismiss={args.onClose}
      role="dialog"
      aria-label={t('live.matchSettings')}
      data-testid="live-settings"
    >
      <Page>
        <Top>
          <h2 style={{ fontSize: '2rem', margin: 0 }}>{t('live.matchSettings')}</h2>
          <Button
            type="button"
            $variant="ghost"
            onClick={args.onClose}
            data-testid="close-live-settings"
          >
            {t('live.closeSettings')}
          </Button>
        </Top>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 1rem', fontSize: '0.9rem' }}>
          {t('live.settingsHint')}
        </p>
        <Stack $gap="0.75rem">
          <Heading>{t('live.endMatch')}</Heading>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
            {t('live.walkoverHint')}
          </p>
          {walkoverStep === 'idle' && (
            <Button
              type="button"
              $variant="ghost"
              onClick={() => setWalkoverStep('pick')}
              data-testid="settings-open-walkover"
            >
              {t('live.walkover')}
            </Button>
          )}
          {walkoverStep === 'pick' && (
            <Stack $gap="0.5rem" data-testid="walkover-pick">
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('live.walkoverWho')}</p>
              <Row $gap="0.5rem" $wrap>
                {(['a', 'b'] as Side[]).map((side) => (
                  <Button
                    key={side}
                    type="button"
                    $variant="ghost"
                    onClick={() => {
                      setWalkoverSide(side)
                      setWalkoverStep('confirm')
                    }}
                    data-testid={`walkover-pick-${side}`}
                  >
                    {t('live.walkoverAward', { name: args.sideName(side) })}
                  </Button>
                ))}
              </Row>
              <Button
                type="button"
                $variant="ghost"
                onClick={() => setWalkoverStep('idle')}
                data-testid="walkover-cancel-pick"
              >
                {t('common.cancel')}
              </Button>
            </Stack>
          )}
          {walkoverStep === 'confirm' && walkoverSide && (
            <Stack $gap="0.5rem" data-testid="walkover-confirm">
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                {t('live.walkoverConfirm', { name: args.sideName(walkoverSide) })}
              </p>
              <Row $gap="0.5rem" $wrap>
                <Button
                  type="button"
                  $variant="danger"
                  onClick={() => {
                    args.onWalkover(walkoverSide)
                    args.onClose()
                  }}
                  data-testid="confirm-walkover"
                >
                  {t('live.walkoverConfirmAction')}
                </Button>
                <Button
                  type="button"
                  $variant="ghost"
                  onClick={() => {
                    setWalkoverSide(null)
                    setWalkoverStep('pick')
                  }}
                  data-testid="walkover-back"
                >
                  {t('live.walkoverBack')}
                </Button>
              </Row>
            </Stack>
          )}

          <Heading>{t('live.timers')}</Heading>
          <Field>
            Set break (seconds)
            <input
              type="number"
              min={0}
              value={draft.breakDurationSeconds}
              onChange={(e) => patch({ breakDurationSeconds: Number(e.target.value) || 0 })}
              data-testid="live-break-sec"
            />
          </Field>
          <Field>
            Changeover (seconds)
            <input
              type="number"
              min={0}
              value={draft.changeoverDurationSeconds}
              onChange={(e) => patch({ changeoverDurationSeconds: Number(e.target.value) || 0 })}
              data-testid="live-changeover-sec"
            />
          </Field>
          <Field>
            Warm-up (seconds)
            <input
              type="number"
              min={0}
              value={draft.warmupDurationSeconds}
              onChange={(e) => patch({ warmupDurationSeconds: Number(e.target.value) || 0 })}
              data-testid="live-warmup-sec"
            />
          </Field>
          <Field>
            Ball change reminders
            <select
              value={draft.ballChangeEnabled ? 'on' : 'off'}
              onChange={(e) => patch({ ballChangeEnabled: e.target.value === 'on' })}
              data-testid="live-ball-change"
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </Field>
          {draft.ballChangeEnabled && (
            <>
              <Field>
                First ball change after (games)
                <input
                  type="number"
                  min={1}
                  value={draft.ballChangeFirstGames}
                  onChange={(e) => patch({ ballChangeFirstGames: Number(e.target.value) || 1 })}
                  data-testid="live-ball-first"
                />
              </Field>
              <Field>
                Then every (games)
                <input
                  type="number"
                  min={1}
                  value={draft.ballChangeEveryGames}
                  onChange={(e) => patch({ ballChangeEveryGames: Number(e.target.value) || 1 })}
                  data-testid="live-ball-every"
                />
              </Field>
              <Field>
                Ball change (seconds)
                <input
                  type="number"
                  min={0}
                  value={draft.ballChangeDurationSeconds}
                  onChange={(e) =>
                    patch({ ballChangeDurationSeconds: Number(e.target.value) || 0 })
                  }
                  data-testid="live-ball-sec"
                />
              </Field>
            </>
          )}

          <Heading>Match details</Heading>
          <Field>
            Date
            <input
              type="date"
              value={draft.date}
              onChange={(e) => patch({ date: e.target.value })}
              data-testid="live-date"
            />
          </Field>
          <Field>
            Time of day
            <select
              value={draft.timeOfDay ?? 'afternoon'}
              onChange={(e) => patch({ timeOfDay: e.target.value as TimeOfDay })}
              data-testid="live-time-of-day"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </Field>
          <Field>
            Weather
            <input
              value={draft.weather}
              onChange={(e) => patch({ weather: e.target.value })}
              placeholder="Sunny, windy…"
              data-testid="live-weather"
            />
          </Field>
          <Field>
            Court surface
            <select
              value={draft.courtSurface ?? 'hard'}
              onChange={(e) => patch({ courtSurface: e.target.value as CourtSurface })}
              data-testid="live-surface"
            >
              <option value="hard">Hard</option>
              <option value="concrete">Concrete</option>
              <option value="clay">Clay</option>
              <option value="grass">Grass</option>
              <option value="carpet">Carpet</option>
              <option value="indoor">Indoor</option>
            </select>
          </Field>
          <Field>
            Notes
            <textarea
              value={draft.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              data-testid="live-notes"
            />
          </Field>
          <Row $gap="0.5rem" $wrap>
            <Button
              type="button"
              $variant="accent"
              disabled={!draft.date}
              onClick={() => {
                args.onSave(draft)
                args.onClose()
              }}
              data-testid="save-live-settings"
            >
              {t('live.saveSettings')}
            </Button>
            <Button type="button" $variant="ghost" onClick={args.onClose}>
              {t('common.cancel')}
            </Button>
          </Row>
        </Stack>
      </Page>
    </Shell>
  )
}
