import type { ServeInfo } from '../engine'
import { useT } from '../i18n/useT'
import { ServeBadge, ServeStrip } from '../styles/ui'

interface Props {
  serve: ServeInfo
  nameOf: (id: string) => string
  pulse?: boolean
  secondServe?: boolean
}

export function ServeReceiveStrip({ serve, nameOf, pulse, secondServe }: Props) {
  const t = useT()
  return (
    <ServeStrip $pulse={pulse} data-testid="serve-strip">
      <ServeBadge $kind="serve" data-testid="serving-badge">
        <small>{t(secondServe ? 'live.serving2nd' : 'live.serving1st')}</small>
        <strong>{nameOf(serve.serverId)}</strong>
      </ServeBadge>
      <ServeBadge $kind="receive" data-testid="receiving-badge">
        <small>
          {t('live.receiving')} · {t(serve.receiverCourt === 'deuce' ? 'live.deuce' : 'live.ad')}
        </small>
        <strong>{nameOf(serve.receiverId)}</strong>
      </ServeBadge>
    </ServeStrip>
  )
}
