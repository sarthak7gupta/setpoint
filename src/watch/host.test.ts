import type { IncomingMessage, ServerResponse } from 'node:http'
import { PassThrough } from 'node:stream'
import type { Connect, ViteDevServer } from 'vite'
import { expect, it } from 'vitest'
import { freshSingles } from '../../shared/engine/testHelpers'
import { buildWatchSnapshot } from '../../shared/watch/protocol'
import { setpointWatchPlugin } from '../../vite-plugin-setpoint-watch'

it('protects the publisher, validates state, and prevents another tab from replacing or clearing a match', async () => {
  let middleware!: Connect.NextHandleFunction
  const configure = setpointWatchPlugin().configureServer
  if (typeof configure !== 'function') throw new Error('Missing host')
  ;(configure as (server: ViteDevServer) => unknown)({
    middlewares: {
      use: (handler: Connect.NextHandleFunction) => {
        middleware = handler
      },
    },
  } as unknown as ViteDevServer)
  const request = (method: string, headers: Record<string, string> = {}, body = '') =>
    new Promise<{ status: number; headers: Record<string, string>; body: string }>((resolve) => {
      const req = Object.assign(new PassThrough(), {
        method,
        url: '/__setpoint/watch',
        headers: { host: 'localhost:5173', ...headers },
      })
      const responseHeaders: Record<string, string> = {}
      let status = 0
      const res = {
        setHeader: (k: string, v: string) => {
          responseHeaders[k] = v
        },
        writeHead: (code: number, headers: Record<string, string>) => {
          status = code
          Object.assign(responseHeaders, headers)
        },
        end: (text = '') => resolve({ status, headers: responseHeaders, body: text }),
      }
      middleware(req as unknown as IncomingMessage, res as unknown as ServerResponse, () => {})
      req.end(body)
    })
  expect((await request('POST', {}, '{}')).status).toBe(403)
  const head = await request('HEAD', { 'sec-fetch-site': 'same-origin' })
  const headers = {
    'sec-fetch-site': 'same-origin',
    'x-setpoint-publish-key': head.headers['x-setpoint-publish-key'],
    'x-setpoint-publisher': 'scoring-tab-one',
  }
  const snapshot = buildWatchSnapshot({
    matchId: 'm',
    state: freshSingles(),
    theme: 'wimbledon',
    playerNames: {},
  })
  expect(
    (
      await request(
        'POST',
        headers,
        JSON.stringify({ ...snapshot, state: { ...snapshot.state, sets: [] } }),
      )
    ).status,
  ).toBe(400)
  expect((await request('POST', headers, JSON.stringify(snapshot))).status).toBe(204)
  const other = { ...headers, 'x-setpoint-publisher': 'scoring-tab-two' }
  expect(
    (await request('POST', other, JSON.stringify({ ...snapshot, matchId: 'other' }))).status,
  ).toBe(409)
  await request('POST', other)
  expect(JSON.parse((await request('GET')).body).matchId).toBe('m')
  await request('POST', headers)
  expect((await request('GET')).status).toBe(204)
})
