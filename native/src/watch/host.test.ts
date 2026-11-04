import { expect, it, vi } from 'vitest'
import { createWatchHost } from './host'
vi.mock('react-native', () => ({ NativeModules: {} }))

it('shares concurrent startup and closes a listener stopped before listen completes', async () => {
  let listening!: () => void
  const server = { on: vi.fn(), listen: vi.fn((_options, callback) => { listening=callback }), close: vi.fn() }
  const tcp = { createServer:vi.fn(()=>server) }
  const host = createWatchHost(()=>tcp)
  const first=host.startWatchServer(), second=host.startWatchServer()
  expect(first).toBe(second)
  expect(tcp.createServer).toHaveBeenCalledTimes(1)
  host.stopWatchServer()
  await expect(first).resolves.toBe('listen-failed')
  expect(server.close).toHaveBeenCalled()
  listening()
  expect(server.close).toHaveBeenCalledTimes(2)
  const next=host.startWatchServer()
  listening()
  await expect(next).resolves.toBe('ok')
  host.stopWatchServer()
})
