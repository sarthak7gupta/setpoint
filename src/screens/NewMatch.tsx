import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  createSetupLineup,
  matchConfigFromSetup,
  useMatchSetup,
} from '../../shared/hooks/useMatchSetup'
import { canonicalPlayerId, playerIdentityIds } from '../../shared/utils/players'
import { FormDots, HeadToHeadCard } from '../components/FormRecord'
import { useApp } from '../context/AppContext'
import {
  getMatch,
  listMatches,
  listPlayers,
  type MatchRecord,
  type PlayerRecord,
  upsertPlayer,
} from '../db'
import type { CourtSurface, TimeOfDay } from '../engine/types'
import { startNewMatch } from '../hooks/useMatchController'
import { surfaceTxKey, todTxKey } from '../i18n'
import { useT } from '../i18n/useT'
import { headToHead, playerForm } from '../stats/form'
import {
  Accordion,
  AccordionBody,
  Button,
  Field,
  Page,
  PlayerRow,
  PlayerSlot,
  ReorderBtn,
  ReorderButtons,
  Row,
  ScreenTopBar,
  Stack,
  Sub,
} from '../styles/ui'
import { timeOfDayFromDate } from '../utils/timeOfDay'

function matchLabel(m: MatchRecord): string {
  const names = m.config.playerIds.map((id) => m.playerNames[id] ?? id)
  const vs =
    m.config.format === 'singles'
      ? `${names[0]} vs ${names[1]}`
      : `${names[0]}/${names[1]} vs ${names[2]}/${names[3]}`
  return `${vs} · ${m.metadata.date}`
}

export function NewMatch() {
  const t = useT()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { settings, ready } = useApp()
  const { setup, setField, setName, swapSlots, copySetup } = useMatchSetup(settings, ready)
  const {
    format,
    bestOf,
    tiebreakPoints,
    finalSetTiebreak,
    finalSetTbPoints,
    noAdScoring,
    breakSec,
    changeoverSec,
    ballChangeEnabled,
    ballChangeFirst,
    ballChangeEvery,
    ballChangeSec,
    warmupEnabled,
    warmupSec,
    firstServerIndex,
    firstReceiverIndex,
    weather,
    surface,
    notes,
    names,
    selectedIds,
  } = setup
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(timeOfDayFromDate)
  const [existing, setExisting] = useState<PlayerRecord[]>([])
  const [history, setHistory] = useState<MatchRecord[]>([])
  const [copyFromId, setCopyFromId] = useState('')
  const [setupStatus, setSetupStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [busy, setBusy] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const loadProfiles = useCallback(() => {
    setSetupStatus('loading')
    void Promise.all([listPlayers(), listMatches()]).then(
      ([players, matches]) => {
        setExisting(players)
        setHistory(matches)
        setSetupStatus('ready')
      },
      () => setSetupStatus('error'),
    )
  }, [])
  useEffect(loadProfiles, [loadProfiles])

  const activeSlots = format === 'singles' ? 2 : 4

  const applyCopiedSetup = useCallback(
    (match: MatchRecord) => {
      copySetup(match)
      setDate(new Date().toISOString().slice(0, 10))
      setTimeOfDay(timeOfDayFromDate())
    },
    [copySetup],
  )

  useEffect(() => {
    const fromId = searchParams.get('from')
    if (!fromId) return
    let cancelled = false
    void getMatch(fromId).then(
      (match) => {
        if (cancelled || !match) return
        applyCopiedSetup(match)
        setCopyFromId(fromId)
      },
      () => {
        if (!cancelled) setSetupStatus('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [searchParams, applyCopiedSetup])

  const copyFromMatch = (id: string) => {
    setCopyFromId(id)
    const match = history.find((r) => r.id === id)
    if (!match) return
    applyCopiedSetup(match)
  }

  const recent = history.slice(0, 20)

  const preview = useMemo(() => {
    const slotCount = format === 'singles' ? 2 : 4
    const perSide = format === 'singles' ? 1 : 2
    const forms = names.slice(0, slotCount).map((_name, index) => {
      const id = selectedIds[index]
      return id
        ? playerForm({
            playerId: id,
            identityIds: playerIdentityIds(id, existing),
            matches: history,
          })
        : null
    })
    const idsA: string[] = []
    const idsB: string[] = []
    for (let i = 0; i < perSide; i++) {
      const idA = selectedIds[i]
      const idB = selectedIds[i + perSide]
      if (idA) idsA.push(idA)
      if (idB) idsB.push(idB)
    }
    const h2h =
      idsA.length === perSide && idsB.length === perSide
        ? headToHead({ format, idsA, idsB, matches: history, players: existing })
        : null
    const labelA =
      format === 'singles' ? names[0].trim() : `${names[0].trim()} / ${names[1].trim()}`
    const labelB =
      format === 'singles' ? names[1].trim() : `${names[2].trim()} / ${names[3].trim()}`
    return { forms, h2h, labelA, labelB }
  }, [names, selectedIds, format, existing, history])

  const start = async () => {
    const trimmed = names.slice(0, activeSlots).map((n) => n.trim())
    if (trimmed.some((n) => !n)) {
      setStartError(t('new.enterNames'))
      return
    }
    setStartError(null)
    setBusy(true)
    try {
      const canonicalIds = selectedIds
        .slice(0, activeSlots)
        .filter((id): id is string => !!id)
        .map((id) => canonicalPlayerId(id, existing))
      if (new Set(canonicalIds).size !== canonicalIds.length) {
        setStartError(t('new.duplicate'))
        return
      }
      const players = await createSetupLineup(setup, existing, upsertPlayer)
      const playerIds = players.map((p) => p.id)
      const playerNames = Object.fromEntries(players.map((p) => [p.id, p.name]))
      const config = matchConfigFromSetup(setup, playerIds)

      const record = await startNewMatch({
        config,
        metadata: {
          date,
          timeOfDay,
          weather: weather || undefined,
          courtSurface: surface,
          notes: notes || undefined,
        },
        playerNames,
      })
      navigate(`/match/${record.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('new.couldNotStart')
      setStartError(message)
    } finally {
      setBusy(false)
    }
  }

  const labels =
    format === 'singles'
      ? [t('new.playerA'), t('new.playerB')]
      : [t('new.teamA1'), t('new.teamA2'), t('new.teamB1'), t('new.teamB2')]

  const moveSlot = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= activeSlots) return
    swapSlots(index, target)
  }

  return (
    <Page>
      <ScreenTopBar>
        <Button type="button" $variant="ghost" onClick={() => navigate('/app')}>
          {t('new.cancel')}
        </Button>
      </ScreenTopBar>
      <h2 style={{ fontSize: '2.4rem' }}>{t('new.title')}</h2>
      <Sub>{t('new.sub')}</Sub>
      {setupStatus === 'loading' && <p role="status">{t('common.loading')}</p>}
      {setupStatus === 'error' && (
        <div role="alert">
          <p>{t('common.loadFailed')}</p>
          <Button onClick={loadProfiles}>{t('common.retry')}</Button>
        </div>
      )}
      <Stack $gap="1rem">
        {recent.length > 0 && (
          <Field>
            {t('new.copyFrom')}
            <select value={copyFromId} onChange={(e) => copyFromMatch(e.target.value)}>
              <option value="">{t('new.copyPlaceholder')}</option>
              {recent.map((m) => (
                <option key={m.id} value={m.id}>
                  {matchLabel(m)}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Row $gap="0.5rem">
          <Button
            type="button"
            $variant={format === 'singles' ? 'primary' : 'ghost'}
            onClick={() => setField('format', 'singles')}
          >
            {t('new.singles')}
          </Button>
          <Button
            type="button"
            $variant={format === 'doubles' ? 'primary' : 'ghost'}
            onClick={() => setField('format', 'doubles')}
          >
            {t('new.doubles')}
          </Button>
        </Row>

        <div>
          <p
            style={{
              margin: '0 0 0.5rem',
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            {t('new.players')}
          </p>
          <Stack $gap="0.55rem">
            {labels.slice(0, activeSlots).map((label, i) => {
              const form = preview.forms[i]
              return (
                <PlayerSlot key={`${format}-${i}`}>
                  <Field htmlFor={`player-name-${i}`}>{label}</Field>
                  <PlayerRow>
                    <input
                      id={`player-name-${i}`}
                      value={names[i]}
                      onChange={(e) => setName(i, e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      placeholder={t('new.namePlaceholder')}
                      data-testid={`player-name-${i}`}
                    />
                    <ReorderButtons>
                      <ReorderBtn
                        type="button"
                        aria-label={t('a11y.moveUp', { name: label })}
                        disabled={i === 0}
                        onClick={() => moveSlot(i, -1)}
                      >
                        ▲
                      </ReorderBtn>
                      <ReorderBtn
                        type="button"
                        aria-label={t('a11y.moveDown', { name: label })}
                        disabled={i === activeSlots - 1}
                        onClick={() => moveSlot(i, 1)}
                      >
                        ▼
                      </ReorderBtn>
                    </ReorderButtons>
                  </PlayerRow>
                  <Field>
                    {t('identity.profile')}
                    <select
                      aria-label={`${t('identity.profile')} ${label}`}
                      value={selectedIds[i] ? canonicalPlayerId(selectedIds[i]!, existing) : ''}
                      onChange={(event) => {
                        const player = existing.find((p) => p.id === event.target.value)
                        setName(i, player?.name ?? names[i], player?.id ?? null)
                      }}
                    >
                      <option value="">{t('identity.new')}</option>
                      {existing
                        .filter((p) => !p.mergedInto)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {p.id.slice(0, 6)}
                          </option>
                        ))}
                    </select>
                  </Field>
                  {form && <FormDots results={form} testId={`form-dots-${i}`} />}
                </PlayerSlot>
              )
            })}
          </Stack>
        </div>

        {preview.h2h && (
          <HeadToHeadCard labelA={preview.labelA} labelB={preview.labelB} h2h={preview.h2h} />
        )}

        <Button
          type="button"
          $variant="accent"
          disabled={busy || !ready || setupStatus !== 'ready'}
          onClick={() => void start()}
          data-testid="quick-start"
        >
          {busy ? t('new.starting') : t('new.start')}
        </Button>
        <Accordion>
          <summary>{t('new.advanced')}</summary>
          <AccordionBody>
            <Field>
              {t('new.bestOf')}
              <select
                value={bestOf}
                onChange={(e) => setField('bestOf', Number(e.target.value) as 1 | 3 | 5)}
              >
                <option value={1}>{t('new.bestOf1')}</option>
                <option value={3}>{t('new.bestOf3')}</option>
                <option value={5}>{t('new.bestOf5')}</option>
              </select>
            </Field>

            <Field>
              {t('new.firstServer')}
              <select
                value={firstServerIndex}
                onChange={(e) => setField('firstServerIndex', Number(e.target.value))}
              >
                {labels.slice(0, activeSlots).map((label, i) => (
                  <option key={label} value={i}>
                    {names[i] || label}
                  </option>
                ))}
              </select>
            </Field>

            {format === 'doubles' && (
              <Field>
                {t('new.firstReceiver')}
                <select
                  value={firstReceiverIndex}
                  onChange={(e) => setField('firstReceiverIndex', Number(e.target.value))}
                >
                  {(firstServerIndex < 2 ? [2, 3] : [0, 1]).map((i) => (
                    <option key={i} value={i}>
                      {names[i] || labels[i]}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Accordion>
              <summary>{t('new.rules')}</summary>
              <AccordionBody>
                <Field>
                  {t('new.tiebreakTo')}
                  <select
                    value={tiebreakPoints}
                    onChange={(e) => setField('tiebreakPoints', Number(e.target.value))}
                  >
                    <option value={7}>{t('new.points7')}</option>
                    <option value={10}>{t('new.points10')}</option>
                    <option value={5}>{t('new.points5')}</option>
                  </select>
                </Field>
                <Field>
                  {t('new.finalSet')}
                  <select
                    value={finalSetTiebreak ? 'tb' : 'adv'}
                    onChange={(e) => setField('finalSetTiebreak', e.target.value === 'tb')}
                  >
                    <option value="tb">{t('new.tiebreak')}</option>
                    <option value="adv">{t('new.advantageNoTb')}</option>
                  </select>
                </Field>
                {finalSetTiebreak && (
                  <Field>
                    {t('new.finalTbTo')}
                    <select
                      value={finalSetTbPoints}
                      onChange={(e) => setField('finalSetTbPoints', Number(e.target.value))}
                    >
                      <option value={7}>7</option>
                      <option value={10}>10</option>
                    </select>
                  </Field>
                )}
                <Field>
                  {t('new.noAd')}
                  <select
                    value={noAdScoring ? 'noad' : 'ad'}
                    onChange={(e) => setField('noAdScoring', e.target.value === 'noad')}
                  >
                    <option value="ad">{t('new.noAdOff')}</option>
                    <option value="noad">{t('new.noAdOn')}</option>
                  </select>
                </Field>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                  {t('new.timerHint')}
                </p>
                <Field>
                  {t('new.breakSec')}
                  <input
                    type="number"
                    min={0}
                    value={breakSec}
                    onChange={(e) => setField('breakSec', Number(e.target.value))}
                  />
                </Field>
                <Field>
                  {t('new.changeoverSec')}
                  <input
                    type="number"
                    min={0}
                    value={changeoverSec}
                    onChange={(e) => setField('changeoverSec', Number(e.target.value))}
                  />
                </Field>
                <Field>
                  {t('new.warmupTimer')}
                  <select
                    value={warmupEnabled ? 'on' : 'off'}
                    onChange={(e) => setField('warmupEnabled', e.target.value === 'on')}
                  >
                    <option value="on">{t('new.warmupOn')}</option>
                    <option value="off">{t('settings.off')}</option>
                  </select>
                </Field>
                {warmupEnabled && (
                  <Field>
                    {t('new.warmupSec')}
                    <input
                      type="number"
                      min={0}
                      value={warmupSec}
                      onChange={(e) => setField('warmupSec', Number(e.target.value))}
                    />
                  </Field>
                )}
                <Field>
                  {t('new.ballReminders')}
                  <select
                    value={ballChangeEnabled ? 'on' : 'off'}
                    onChange={(e) => setField('ballChangeEnabled', e.target.value === 'on')}
                  >
                    <option value="on">{t('new.ballOn')}</option>
                    <option value="off">{t('settings.off')}</option>
                  </select>
                </Field>
                {ballChangeEnabled && (
                  <>
                    <Field>
                      {t('new.ballFirst')}
                      <input
                        type="number"
                        min={1}
                        value={ballChangeFirst}
                        onChange={(e) => setField('ballChangeFirst', Number(e.target.value))}
                      />
                    </Field>
                    <Field>
                      {t('new.ballEvery')}
                      <input
                        type="number"
                        min={1}
                        value={ballChangeEvery}
                        onChange={(e) => setField('ballChangeEvery', Number(e.target.value))}
                      />
                    </Field>
                    <Field>
                      {t('new.ballSec')}
                      <input
                        type="number"
                        min={0}
                        value={ballChangeSec}
                        onChange={(e) => setField('ballChangeSec', Number(e.target.value))}
                      />
                    </Field>
                  </>
                )}
              </AccordionBody>
            </Accordion>

            <Accordion>
              <summary>{t('new.details')}</summary>
              <AccordionBody>
                <Field>
                  {t('new.date')}
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field>
                  {t('new.timeOfDay')}
                  <select
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
                  >
                    {(['morning', 'afternoon', 'evening', 'night'] as TimeOfDay[]).map((tod) => (
                      <option key={tod} value={tod}>
                        {t(todTxKey(tod))}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  {t('new.weather')}
                  <input
                    value={weather}
                    onChange={(e) => setField('weather', e.target.value)}
                    placeholder={t('new.weatherPlaceholder')}
                  />
                </Field>
                <Field>
                  {t('new.surface')}
                  <select
                    value={surface}
                    onChange={(e) => setField('surface', e.target.value as CourtSurface)}
                  >
                    {(
                      ['hard', 'concrete', 'clay', 'grass', 'carpet', 'indoor'] as CourtSurface[]
                    ).map((s) => (
                      <option key={s} value={s}>
                        {t(surfaceTxKey(s))}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  {t('new.notes')}
                  <textarea value={notes} onChange={(e) => setField('notes', e.target.value)} />
                </Field>
              </AccordionBody>
            </Accordion>
          </AccordionBody>
        </Accordion>

        {startError && (
          <p
            role="alert"
            style={{
              margin: 0,
              color: 'var(--danger)',
              fontSize: '0.95rem',
              padding: '0.65rem 0.75rem',
              border: '1px solid var(--danger)',
              borderRadius: 10,
              background: 'rgba(232, 93, 106, 0.12)',
            }}
          >
            {startError}
          </p>
        )}
      </Stack>
    </Page>
  )
}
