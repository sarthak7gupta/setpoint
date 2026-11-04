import { useMatchSetup, matchConfigFromSetup, createSetupLineup } from '../../../shared/hooks/useMatchSetup'
import { canonicalPlayerId, playerIdentityIds } from '../../../shared/utils/players'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormDots, HeadToHeadCard } from '../components/FormRecord'
import { useApp } from '../context/AppContext'
import { getMatch, listMatches, listPlayers, type MatchRecord, type PlayerRecord, upsertPlayer } from '../db'
import type { CourtSurface, TimeOfDay } from '../engine/types'
import { startNewMatch } from '../hooks/useMatchController'
import type { RootStackParamList } from '../navigation/types'
import { headToHead, playerForm } from '../stats/form'
import {
  Accordion,
  AlertBox,
  AlertText,
  AppButton,
  FeedbackPressable,
  Field,
  FieldLabel,
  Input,
  Muted,
  PlayerRow,
  ReorderBtn,
  ReorderButtons,
  ReorderBtnText,
  Row,
  Screen,
  ScreenTopBar,
  SelectField,
  Stack,
  Sub,
  Title,
  TwoPane,
} from '../styles/ui'
import { timeOfDayFromDate } from '../utils/timeOfDay'
import { surfaceTxKey, todTxKey } from '../i18n'
import { useT } from '../i18n/useT'
import { useLayout } from '../layout/useLayout'
import styled from 'styled-components/native'

type Props = NativeStackScreenProps<RootStackParamList, 'NewMatch'>

const SectionLabel = styled.Text`
  margin-bottom: 8px;
  font-size: 12px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${(p) => p.theme.textMuted};
  font-family: ${(p) => p.theme.fontUi};
`

const NameField = styled.View`
  flex-direction: column;
`

const PlayerInput = styled(Input)`
  flex: 1;
`

const Suggestion = styled(FeedbackPressable)`
  padding: 8px 0;
`

const SuggestionText = styled.Text`
  color: ${(p) => p.theme.accentSoft};
  font-size: 14px;
  font-family: ${(p) => p.theme.fontUi};
`

function matchLabel(m: MatchRecord): string {
  const names = m.config.playerIds.map((id) => m.playerNames[id] ?? id)
  const vs =
    m.config.format === 'singles'
      ? `${names[0]} vs ${names[1]}`
      : `${names[0]}/${names[1]} vs ${names[2]}/${names[3]}`
  return `${vs} · ${m.metadata.date}`
}

export function NewMatch({ navigation, route }: Props) {
  const t = useT()
  const { twoPane } = useLayout()
  const { settings, ready } = useApp()
  const { setup, setField, setName, swapSlots, copySetup } = useMatchSetup(settings, ready)
  const { format, bestOf, tiebreakPoints, finalSetTiebreak, finalSetTbPoints, noAdScoring, breakSec, changeoverSec, ballChangeEnabled, ballChangeFirst, ballChangeEvery, ballChangeSec, warmupEnabled, warmupSec, firstServerIndex, firstReceiverIndex, weather, surface, notes, names, selectedIds } = setup
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(timeOfDayFromDate())
  const [existing, setExisting] = useState<PlayerRecord[]>([])
  const [history, setHistory] = useState<MatchRecord[]>([])
  const [copyFromId, setCopyFromId] = useState('')
  const [setupStatus, setSetupStatus] = useState<'loading'|'ready'|'error'>('loading')
  const [busy, setBusy] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [focusedSlot, setFocusedSlot] = useState<number | null>(null)
  const [nameSelection, setNameSelection] = useState<
    Record<number, { start: number; end: number } | undefined>
  >({})

  const loadProfiles = useCallback(() => {
    setSetupStatus('loading')
    void Promise.all([listPlayers(), listMatches()]).then(([players,matches]) => {
      setExisting(players); setHistory(matches); setSetupStatus('ready')
    }, () => setSetupStatus('error'))
  }, [])
  useEffect(loadProfiles, [loadProfiles])

  const activeSlots = format === 'singles' ? 2 : 4

  const applyCopiedSetup = useCallback((match: MatchRecord) => {
    copySetup(match)
    setDate(new Date().toISOString().slice(0, 10))
    setTimeOfDay(timeOfDayFromDate())
  }, [copySetup])

  useEffect(() => {
    const fromId = route.params?.from
    if (!fromId) return
    let cancelled = false
    void getMatch(fromId).then((match) => {
      if (cancelled || !match) return
      applyCopiedSetup(match)
      setCopyFromId(fromId)
    }, () => {
      if (!cancelled) setSetupStatus('error')
    })
    return () => { cancelled = true }
  }, [route.params?.from, applyCopiedSetup])

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
      return id ? playerForm({ playerId: id, identityIds: playerIdentityIds(id, existing), matches: history }) : null
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
      const canonicalIds = selectedIds.slice(0,activeSlots).filter((id): id is string => !!id).map(id => canonicalPlayerId(id,existing))
      if (new Set(canonicalIds).size !== canonicalIds.length) { setStartError(t('new.duplicate')); return }
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
      navigation.replace('LiveMatch', { matchId: record.id })
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


  const setupBlock = (
    <>
      {recent.length > 0 && (
        <SelectField
          label={t('new.copyFrom')}
          value={copyFromId}
          onChange={copyFromMatch}
          options={[
            { value: '', label: t('new.copyPlaceholder') },
            ...recent.map((m) => ({ value: m.id, label: matchLabel(m) })),
          ]}
        />
      )}
      <Row $gap={8}>
        <AppButton
          variant={format === 'singles' ? 'primary' : 'ghost'}
          onPress={() => setField('format', 'singles')}
        >
          {t('new.singles')}
        </AppButton>
        <AppButton
          variant={format === 'doubles' ? 'primary' : 'ghost'}
          onPress={() => setField('format', 'doubles')}
        >
          {t('new.doubles')}
        </AppButton>
      </Row>
    </>
  )

  const playersBlock = (
    <>
      <Stack $gap={9}>
        <SectionLabel>{t('new.players')}</SectionLabel>
        {labels.slice(0, activeSlots).map((label, i) => {
          const form = preview.forms[i]
          const query = names[i].trim().toLowerCase()
          const suggestions =
            focusedSlot === i && query.length > 0
              ? existing
                  .filter((p) => !p.mergedInto && p.name.toLowerCase().includes(query))
                  .slice(0, 5)
              : []
          return (
            <NameField key={`${format}-${i}`}>
              <FieldLabel>{label}</FieldLabel>
              <PlayerRow>
                <PlayerInput
                  value={names[i]}
                  onChangeText={(value) => {
                    setNameSelection((prev) => ({ ...prev, [i]: undefined }))
                    setName(i, value)
                  }}
                  placeholder={t('new.namePlaceholder')}
                  testID={`player-name-${i}`}
                  onFocus={() => {
                    setFocusedSlot(i)
                    const len = names[i].length
                    setNameSelection((prev) => ({ ...prev, [i]: { start: 0, end: len } }))
                  }}
                  onBlur={() => setFocusedSlot(null)}
                  selection={nameSelection[i]}
                  autoCorrect={false}
                />
                <ReorderButtons>
                  <ReorderBtn
                    $disabled={i === 0}
                    disabled={i === 0}
                    onPress={() => moveSlot(i, -1)}
                  >
                    <ReorderBtnText>▲</ReorderBtnText>
                  </ReorderBtn>
                  <ReorderBtn
                    $disabled={i === activeSlots - 1}
                    disabled={i === activeSlots - 1}
                    onPress={() => moveSlot(i, 1)}
                  >
                    <ReorderBtnText>▼</ReorderBtnText>
                  </ReorderBtn>
                </ReorderButtons>
              </PlayerRow>
              <SelectField label={`${t('identity.profile')} ${label}`} value={selectedIds[i] ? canonicalPlayerId(selectedIds[i]!, existing) : ''} onChange={id => {
                const player = existing.find(p => p.id === id)
                setName(i, player?.name ?? names[i], player?.id ?? null)
              }} options={[{ value:'', label:t('identity.new') }, ...existing.filter(p => !p.mergedInto).map(p => ({value:p.id,label:`${p.name} · ${p.id.slice(0,6)}`}))]} />
              {suggestions.map((p) => (
                <Suggestion key={p.id} onPress={() => setName(i, p.name, p.id)}>
                  <SuggestionText>{p.name} · {p.id.slice(0,6)}</SuggestionText>
                </Suggestion>
              ))}
              {form && <FormDots results={form} testId={`form-dots-${i}`} />}
            </NameField>
          )
        })}
      </Stack>
      {preview.h2h && (
        <HeadToHeadCard labelA={preview.labelA} labelB={preview.labelB} h2h={preview.h2h} />
      )}
      <SelectField
        label={t('new.bestOf')}
        value={bestOf}
        onChange={(value) => setField('bestOf', value)}
        options={[
          { value: 1, label: t('new.bestOf1') },
          { value: 3, label: t('new.bestOf3') },
          { value: 5, label: t('new.bestOf5') },
        ]}
      />
      <SelectField
        label={t('new.firstServer')}
        value={firstServerIndex}
        onChange={(value) => setField('firstServerIndex', value)}
        options={labels.slice(0, activeSlots).map((label, i) => ({
          value: i,
          label: names[i] || label,
        }))}
      />
      {format === 'doubles' && (
        <SelectField
          label={t('new.firstReceiver')}
          value={firstReceiverIndex}
          onChange={(value) => setField('firstReceiverIndex', value)}
          options={(firstServerIndex < 2 ? [2, 3] : [0, 1]).map((i) => ({
            value: i,
            label: names[i] || labels[i],
          }))}
        />
      )}
    </>
  )

  const rulesBlock = (
    <>
      <Accordion title={t('new.rules')}>
        <SelectField
          label={t('new.tiebreakTo')}
          value={tiebreakPoints}
          onChange={(value) => setField('tiebreakPoints', value)}
          options={[
            { value: 7, label: t('new.points7') },
            { value: 10, label: t('new.points10') },
            { value: 5, label: t('new.points5') },
          ]}
        />
        <SelectField
          label={t('new.finalSet')}
          value={finalSetTiebreak ? 'tb' : 'adv'}
          onChange={(value) => setField('finalSetTiebreak', value === 'tb')}
          options={[
            { value: 'tb', label: t('new.tiebreak') },
            { value: 'adv', label: t('new.advantageNoTb') },
          ]}
        />
        {finalSetTiebreak && (
          <SelectField
            label={t('new.finalTbTo')}
            value={finalSetTbPoints}
            onChange={(value) => setField('finalSetTbPoints', value)}
            options={[
              { value: 7, label: '7' },
              { value: 10, label: '10' },
            ]}
          />
        )}
        <SelectField
          label={t('new.noAd')}
          value={noAdScoring ? 'noad' : 'ad'}
          onChange={(value) => setField('noAdScoring', value === 'noad')}
          options={[
            { value: 'ad', label: t('new.noAdOff') },
            { value: 'noad', label: t('new.noAdOn') },
          ]}
        />
        <Muted>{t('new.timerHint')}</Muted>
        <Field label={t('new.breakSec')}>
          <Input
            keyboardType="number-pad"
            value={String(breakSec)}
            onChangeText={(value) => setField('breakSec', Number(value) || 0)}
          />
        </Field>
        <Field label={t('new.changeoverSec')}>
          <Input
            keyboardType="number-pad"
            value={String(changeoverSec)}
            onChangeText={(value) => setField('changeoverSec', Number(value) || 0)}
          />
        </Field>
        <SelectField
          label={t('new.warmupTimer')}
          value={warmupEnabled ? 'on' : 'off'}
          onChange={(value) => setField('warmupEnabled', value === 'on')}
          options={[
            { value: 'on', label: t('new.warmupOn') },
            { value: 'off', label: t('settings.off') },
          ]}
        />
        {warmupEnabled && (
          <Field label={t('new.warmupSec')}>
            <Input
              keyboardType="number-pad"
              value={String(warmupSec)}
              onChangeText={(value) => setField('warmupSec', Number(value) || 0)}
            />
          </Field>
        )}
        <SelectField
          label={t('new.ballReminders')}
          value={ballChangeEnabled ? 'on' : 'off'}
          onChange={(value) => setField('ballChangeEnabled', value === 'on')}
          options={[
            { value: 'on', label: t('new.ballOn') },
            { value: 'off', label: t('settings.off') },
          ]}
        />
        {ballChangeEnabled && (
          <>
            <Field label={t('new.ballFirst')}>
              <Input
                keyboardType="number-pad"
                value={String(ballChangeFirst)}
                onChangeText={(value) => setField('ballChangeFirst', Number(value) || 1)}
              />
            </Field>
            <Field label={t('new.ballEvery')}>
              <Input
                keyboardType="number-pad"
                value={String(ballChangeEvery)}
                onChangeText={(value) => setField('ballChangeEvery', Number(value) || 1)}
              />
            </Field>
            <Field label={t('new.ballSec')}>
              <Input
                keyboardType="number-pad"
                value={String(ballChangeSec)}
                onChangeText={(value) => setField('ballChangeSec', Number(value) || 0)}
              />
            </Field>
          </>
        )}
      </Accordion>
      <Accordion title={t('new.details')}>
        <Field label={t('new.date')}>
          <Input value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        </Field>
        <SelectField
          label={t('new.timeOfDay')}
          value={timeOfDay}
          onChange={setTimeOfDay}
          options={[
            { value: 'morning', label: t(todTxKey('morning')) },
            { value: 'afternoon', label: t(todTxKey('afternoon')) },
            { value: 'evening', label: t(todTxKey('evening')) },
            { value: 'night', label: t(todTxKey('night')) },
          ]}
        />
        <Field label={t('new.weather')}>
          <Input value={weather} onChangeText={value => setField('weather', value)} placeholder={t('new.weatherPlaceholder')} />
        </Field>
        <SelectField
          label={t('new.surface')}
          value={surface ?? settings.defaultCourtSurface}
          onChange={(value) => setField('surface', value as CourtSurface)}
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
            value={notes}
            onChangeText={value => setField('notes', value)}
            multiline
            style={{ minHeight: 72, textAlignVertical: 'top' }}
          />
        </Field>
      </Accordion>
    </>
  )

  const actionsBlock = (
    <>
      {startError && (
        <AlertBox>
          <AlertText>{startError}</AlertText>
        </AlertBox>
      )}
      <AppButton variant="accent" disabled={busy || !ready || setupStatus !== 'ready'} onPress={() => void start()}>
        {busy ? t('new.starting') : t('new.start')}
      </AppButton>
    </>
  )

  return (
    <Screen keyboard>
      <ScreenTopBar
        label={t('new.cancel')}
        onPress={() => navigation.navigate('Home')}
        testID="screen-cancel"
      />
      <Title>{t('new.title')}</Title>
      <Sub>{t('new.sub')}</Sub>
      {setupStatus === 'loading' && <Muted>{t('common.loading')}</Muted>}
      {setupStatus === 'error' && <><Muted>{t('common.loadFailed')}</Muted><AppButton onPress={loadProfiles}>{t('common.retry')}</AppButton></>}
      {twoPane ? (
        <TwoPane
          a={
            <Stack $gap={16}>
              {setupBlock}
              {playersBlock}
            </Stack>
          }
          b={
            <Stack $gap={16}>
              {rulesBlock}
              {actionsBlock}
            </Stack>
          }
        />
      ) : (
        <Stack $gap={16}>
          {setupBlock}
          {playersBlock}
          {rulesBlock}
          {actionsBlock}
        </Stack>
      )}
    </Screen>
  )
}
