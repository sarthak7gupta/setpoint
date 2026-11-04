/** Serve / return / winner grid for one `StatSituation` slice. */
import type { SliceDisplay } from '../stats/compute'
import { useT } from '../i18n/useT'
import { StatCard, StatGrid, StatSmall, StatStrong } from '../styles/ui'

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${n}%`
}

export function SliceStatGrid(args: { display: SliceDisplay }) {
  const t = useT()
  const { display } = args
  return (
    <StatGrid>
      <StatCard $highlight>
        <StatSmall>{t('summary.firstIn')}</StatSmall>
        <StatStrong>{fmt(display.firstServeInPct)}</StatStrong>
        <StatSmall>{display.samples.firstServeIn}</StatSmall>
      </StatCard>
      <StatCard $highlight>
        <StatSmall>{t('summary.firstWin')}</StatSmall>
        <StatStrong>{fmt(display.firstServeWinPct)}</StatStrong>
        <StatSmall>{display.samples.firstServeWin}</StatSmall>
      </StatCard>
      <StatCard>
        <StatSmall>{t('summary.secondWin')}</StatSmall>
        <StatStrong>{fmt(display.secondServeWinPct)}</StatStrong>
        <StatSmall>{display.samples.secondServeWin}</StatSmall>
      </StatCard>
      <StatCard>
        <StatSmall>{t('summary.acesDfs')}</StatSmall>
        <StatStrong>
          {display.aces} / {display.doubleFaults}
        </StatStrong>
      </StatCard>
      <StatCard>
        <StatSmall>{t('summary.firstReturn')}</StatSmall>
        <StatStrong>{fmt(display.firstReturnWinPct)}</StatStrong>
        <StatSmall>{display.samples.firstReturnWin}</StatSmall>
      </StatCard>
      <StatCard>
        <StatSmall>{t('summary.secondReturn')}</StatSmall>
        <StatStrong>{fmt(display.secondReturnWinPct)}</StatStrong>
        <StatSmall>{display.samples.secondReturnWin}</StatSmall>
      </StatCard>
      <StatCard>
        <StatSmall>{t('summary.servicePts')}</StatSmall>
        <StatStrong>{display.servicePointsWon}</StatStrong>
      </StatCard>
      <StatCard>
        <StatSmall>{t('summary.returnPts')}</StatSmall>
        <StatStrong>{display.returnPointsWon}</StatStrong>
      </StatCard>
      <StatCard>
        <StatSmall>{t('summary.pointsWon')}</StatSmall>
        <StatStrong>{display.pointsWon}</StatStrong>
      </StatCard>
      <StatCard>
        <StatSmall>{t('summary.winnersUes')}</StatSmall>
        <StatStrong>
          {display.winners} / {display.unforcedErrors}
        </StatStrong>
      </StatCard>
    </StatGrid>
  )
}
