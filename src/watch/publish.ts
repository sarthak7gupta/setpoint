import { createId } from '../../shared/engine/helpers'
import { WATCH_HEADER, WATCH_PATH, type WatchSnapshot } from './index'

const publisherId = createId()
let publishKey: string | null = null
let publishTail: Promise<unknown> = Promise.resolve()

export async function watchPublishAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    const res = await fetch(`${window.location.origin}${WATCH_PATH}`, {
      method: 'HEAD',
    })
    publishKey = res.headers.get('x-setpoint-publish-key')
    return res.headers.get(WATCH_HEADER) === '1' && !!publishKey
  } catch {
    return false
  }
}

async function publish(snapshot: WatchSnapshot | null): Promise<boolean> {
  if (!publishKey) return false
  if (typeof window === 'undefined') return false
  try {
    const res = await fetch(`${window.location.origin}${WATCH_PATH}`, {
      method: 'POST',
      signal: AbortSignal.timeout(3000),
      headers: {
        'Content-Type': 'application/json',
        'x-setpoint-publish-key': publishKey,
        'x-setpoint-publisher': publisherId,
      },
      body: snapshot ? JSON.stringify(snapshot) : '',
    })
    if (res.status === 403) await watchPublishAvailable()
    return res.headers.get(WATCH_HEADER) === '1' && res.ok
  } catch {
    return false
  }
}

export function publishWatchSnapshot(snapshot: WatchSnapshot | null): Promise<boolean> {
  const run = publishTail.then(
    () => publish(snapshot),
    () => publish(snapshot),
  )
  publishTail = run
  return run
}
