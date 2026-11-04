import type { ServeInfo } from '../engine'
import { useT } from '../i18n/useT'
import { ServeBadge, ServeBadgeName, ServeBadgeSmall, ServeStrip } from '../styles/ui'

interface Props {
  serve: ServeInfo
  nameOf: (id: string) => string
  pulse?: boolean
  secondServe?: boolean
}

export function ServeReceiveStrip({ serve, nameOf, pulse, secondServe }: Props) {
  const t = useT()
  return (
    <ServeStrip $pulse={pulse} testID="serve-strip">
      <ServeBadge $kind="serve" testID="serving-badge">
        <ServeBadgeSmall $kind="serve">
          {secondServe ? t('live.serving2nd') : t('live.serving1st')}
        </ServeBadgeSmall>
        <ServeBadgeName>{nameOf(serve.serverId)}</ServeBadgeName>
      </ServeBadge>
      <ServeBadge $kind="receive" testID="receiving-badge">
        <ServeBadgeSmall $kind="receive">
          {t('live.receiving')} · {serve.receiverCourt === 'deuce' ? t('live.deuce') : t('live.ad')}
        </ServeBadgeSmall>
        <ServeBadgeName>{nameOf(serve.receiverId)}</ServeBadgeName>
      </ServeBadge>
    </ServeStrip>
  )
}
