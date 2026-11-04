import { filterMatchHistory, validDateRange } from '../../../shared/utils/historyFilters'
import { Dialog } from '../components/Dialog'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useCallback, useState, type ReactNode } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { deleteMatch, listMatches, type MatchRecord } from '../db'
import { formatSetScore } from '../engine'
import { useT } from '../i18n/useT'
import { useLayout } from '../layout/useLayout'
import type { RootStackParamList } from '../navigation/types'
import {
  AppButton, Field, Input, SelectField,
  MatchStatus,
  Muted,
  OverlayBackdrop,
  OverlayCard,
  OverlaySub,
  OverlayTitle,
  Row,
  Screen,
  ScreenTopBar,
  Stack,
  Sub,
  Surface,
  Title,
} from '../styles/ui'
import styled from 'styled-components/native'

type Props = NativeStackScreenProps<RootStackParamList, 'History'>

function MatchCard(args: { children: ReactNode; style?: object }) {
  return (
    <Surface level="card" style={[{ flex: 1, padding: 14 }, args.style]}>
      {args.children}
    </Surface>
  )
}

const MatchName = styled.Text`
  font-family: ${(p) => p.theme.fontUiSemiBold};
  font-size: 16px;
  color: ${(p) => p.theme.text};
`

const Grid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
`

const Slot = styled.View<{ $basis: string }>`
  flex-grow: 1;
  flex-basis: ${(p) => p.$basis};
  min-width: 240px;
`

function matchLabel(m: MatchRecord): string {
  const names = m.config.playerIds.map((id) => m.playerNames[id] ?? id)
  return m.config.format === 'singles'
    ? `${names[0]} vs ${names[1]}`
    : `${names[0]}/${names[1]} vs ${names[2]}/${names[3]}`
}

export function History({ navigation }: Props) {
  const t = useT()
  const { historyColumns } = useLayout()
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [pendingDelete, setPendingDelete] = useState<MatchRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [loadStatus, setLoadStatus] = useState<'loading'|'ready'|'error'>('loading')
  const [deleteError, setDeleteError] = useState(false)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('all')
  const visible = filterMatchHistory(matches, { search, from, to, status })
  const basis = `${(100 / historyColumns).toFixed(2)}%`

  const reload = useCallback(() => {
    setLoadStatus('loading')
    void listMatches().then(m => { setMatches(m); setLoadStatus('ready') }, () => setLoadStatus('error'))
  }, [])

  useFocusEffect(
    useCallback(() => {
      reload()
    }, [reload]),
  )

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteMatch(pendingDelete.id)
      setPendingDelete(null)
      reload()
    } catch { setDeleteError(true) } finally {
      setDeleting(false)
    }
  }

  return (
    <Screen>
      <ScreenTopBar
        label={t('common.home')}
        onPress={() => navigation.navigate('Home')}
        testID="screen-home"
      />
      <Title>{t('history.title')}</Title>
      <Sub>{t('history.sub')}</Sub>
      <Field label={t('history.search')}><Input value={search} onChangeText={setSearch} /></Field>
      <Field label={t('settings.exportFrom')}><Input value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" /></Field>
      <Field label={t('settings.exportTo')}><Input value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" /></Field>
      <SelectField label={t('history.status')} value={status} onChange={setStatus} options={[
        {value:'all',label:t('history.all')},{value:'final',label:t('home.final')},{value:'ongoing',label:t('home.inProgress')},
      ]} />
      {!validDateRange(from,to) && <Muted accessibilityRole="alert">{t('export.dateError')}</Muted>}
      {loadStatus === 'loading' && <Muted>{t('common.loading')}</Muted>}
      {loadStatus === 'error' && <><Muted>{t('common.loadFailed')}</Muted><AppButton onPress={reload}>{t('common.retry')}</AppButton></>}

      <Stack>
        {loadStatus === 'ready' && visible.length === 0 && <Muted>{t(matches.length ? 'history.noResults' : 'history.empty')}</Muted>}
        <Grid>
          {visible.map((m) => {
            const sets = m.state.sets
              .filter((s) => s.completed)
              .map((s) => formatSetScore(s))
              .join(', ')
            return (
              <Slot key={m.id} $basis={basis}>
                <MatchCard>
                  <MatchName>{matchLabel(m)}</MatchName>
                  <Row $gap={8} $wrap style={{ marginTop: 6 }}>
                    <Muted>
                      {m.metadata.date}
                      {sets ? ` · ${sets}` : ''}
                    </Muted>
                    <MatchStatus $complete={m.state.isComplete}>
                      {m.state.isComplete ? t('home.final') : t('home.inProgress')}
                    </MatchStatus>
                  </Row>
                  <Row $gap={6} style={{ marginTop: 10 }}>
                    <AppButton
                      variant="primary"
                      onPress={() =>
                        navigation.navigate(m.state.isComplete ? 'MatchSummary' : 'LiveMatch', {
                          matchId: m.id,
                        })
                      }
                    >
                      {t('history.open')}
                    </AppButton>
                    <AppButton
                      variant="danger"
                      onPress={() => setPendingDelete(m)}
                      testID="delete-match"
                    >
                      {t('history.delete')}
                    </AppButton>
                  </Row>
                </MatchCard>
              </Slot>
            )
          })}
        </Grid>
      </Stack>
      <Dialog
        visible={pendingDelete !== null}
        transparent
        animationType="fade"
        supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
        onRequestClose={() => {
          if (!deleting) setPendingDelete(null)
        }}
      >
        <OverlayBackdrop>
          <OverlayCard>
            {deleteError && <Muted accessibilityRole="alert">{t('common.saveFailed')}</Muted>}
            <OverlayTitle>{t('history.deleteTitle')}</OverlayTitle>
            {pendingDelete && (
              <OverlaySub>
                {t('history.deleteBody', {
                  label: `${matchLabel(pendingDelete)}${pendingDelete.metadata.date ? ` · ${pendingDelete.metadata.date}` : ''}`,
                })}
              </OverlaySub>
            )}
            <Row $gap={8} style={{ justifyContent: 'center' }}>
              <AppButton
                variant="ghost"
                disabled={deleting}
                onPress={() => setPendingDelete(null)}
                testID="cancel-delete-match"
              >
                {t('common.cancel')}
              </AppButton>
              <AppButton
                variant="danger"
                disabled={deleting}
                onPress={() => void confirmDelete()}
                testID="confirm-delete-match"
              >
                {deleting ? t('history.deleting') : t('history.delete')}
              </AppButton>
            </Row>
          </OverlayCard>
        </OverlayBackdrop>
      </Dialog>
    </Screen>
  )
}
