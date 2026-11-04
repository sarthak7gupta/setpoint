import { mapPool, subnetHosts } from './net'
import { parseWatchSnapshotJson, WATCH_PATH, WATCH_SCAN_PORTS, type WatchFound } from './protocol'

export type WatchFetch = (
  url: string,
  init: { method: string; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>

export function watchEndpoints(args: {
  bases: string[]
  ports?: readonly number[]
  skipHost?: string
}): string[] {
  const ports = args.ports ?? WATCH_SCAN_PORTS
  const urls: string[] = []
  const seen = new Set<string>()
  for (const base of args.bases) {
    for (const host of subnetHosts(base, args.skipHost)) {
      for (const port of ports) {
        const url = `http://${host}:${port}${WATCH_PATH}`
        if (seen.has(url)) continue
        seen.add(url)
        urls.push(url)
      }
    }
  }
  return urls
}

export async function probeWatchUrl(
  url: string,
  timeoutMs: number,
  fetchFn: WatchFetch,
): Promise<WatchFound | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchFn(url, { method: 'GET', signal: controller.signal })
    if (!res.ok || res.status === 204) return null
    const snapshot = parseWatchSnapshotJson(await res.text())
    return snapshot ? { url, snapshot } : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function scanWatchNetwork(args: {
  bases: string[]
  ports?: readonly number[]
  skipHost?: string
  timeoutMs?: number
  concurrency?: number
  fetchFn: WatchFetch
  onFound?: (hit: WatchFound) => void
}): Promise<WatchFound[]> {
  const urls = watchEndpoints({
    bases: args.bases,
    ports: args.ports,
    skipHost: args.skipHost,
  })
  const found: WatchFound[] = []
  const seenMatch = new Set<string>()
  await mapPool(urls, args.concurrency ?? 32, async (url) => {
    const hit = await probeWatchUrl(url, args.timeoutMs ?? 350, args.fetchFn)
    if (!hit || seenMatch.has(hit.snapshot.matchId)) return
    seenMatch.add(hit.snapshot.matchId)
    found.push(hit)
    args.onFound?.(hit)
  })
  return found.sort((a, b) => a.snapshot.label.localeCompare(b.snapshot.label))
}
