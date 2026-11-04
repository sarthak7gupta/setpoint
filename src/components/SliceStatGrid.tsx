import { useT } from '../i18n/useT'
/** Serve / return / winner grid for one `StatSituation` slice. */
import type { SliceDisplay } from '../stats/compute'
import { StatCard, StatGrid } from '../styles/ui'

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
        <small>{t('summary.firstIn')}</small>
        <strong>{fmt(display.firstServeInPct)}</strong>
        <small>{display.samples.firstServeIn}</small>
      </StatCard>
      <StatCard $highlight>
        <small>{t('summary.firstWin')}</small>
        <strong>{fmt(display.firstServeWinPct)}</strong>
        <small>{display.samples.firstServeWin}</small>
      </StatCard>
      <StatCard>
        <small>{t('summary.secondWin')}</small>
        <strong>{fmt(display.secondServeWinPct)}</strong>
        <small>{display.samples.secondServeWin}</small>
      </StatCard>
      <StatCard>
        <small>{t('summary.acesDfs')}</small>
        <strong>
          {display.aces} / {display.doubleFaults}
        </strong>
      </StatCard>
      <StatCard>
        <small>{t('summary.firstReturn')}</small>
        <strong>{fmt(display.firstReturnWinPct)}</strong>
        <small>{display.samples.firstReturnWin}</small>
      </StatCard>
      <StatCard>
        <small>{t('summary.secondReturn')}</small>
        <strong>{fmt(display.secondReturnWinPct)}</strong>
        <small>{display.samples.secondReturnWin}</small>
      </StatCard>
      <StatCard>
        <small>{t('summary.servicePts')}</small>
        <strong>{display.servicePointsWon}</strong>
      </StatCard>
      <StatCard>
        <small>{t('summary.returnPts')}</small>
        <strong>{display.returnPointsWon}</strong>
      </StatCard>
      <StatCard>
        <small>{t('summary.pointsWon')}</small>
        <strong>{display.pointsWon}</strong>
      </StatCard>
      <StatCard>
        <small>{t('summary.winnersUes')}</small>
        <strong>
          {display.winners} / {display.unforcedErrors}
        </strong>
      </StatCard>
    </StatGrid>
  )
}
