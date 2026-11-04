/** IPv4 helpers for LAN watch discovery. */

export function isPrivateIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host.trim())
  if (!m) return false
  const a = Number(m[1])
  const b = Number(m[2])
  if ([a, b, Number(m[3]), Number(m[4])].some((n) => n > 255)) return false
  if (a === 10) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

export function ipv4SubnetBase(ip: string): string | null {
  const host = ip.trim()
  if (!isPrivateIpv4(host)) return null
  const parts = host.split('.')
  return `${parts[0]}.${parts[1]}.${parts[2]}`
}

export function subnetHosts(base: string, skipHost?: string): string[] {
  const hosts: string[] = []
  for (let i = 1; i <= 254; i++) {
    const host = `${base}.${i}`
    if (host === skipHost) continue
    hosts.push(host)
  }
  return hosts
}

export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let next = 0
  const limit = Math.max(1, concurrency)
  async function run(): Promise<void> {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await worker(items[index] as T)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()))
  return results
}
