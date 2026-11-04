import { describe, expect, it } from 'vitest'
import { freshSingles, winPoint } from '../engine/testHelpers'
import { parseWatchHttpRequest, watchHttpEmpty, watchHttpJson } from './http'
import { ipv4SubnetBase, isPrivateIpv4, subnetHosts } from './net'
import {
  buildWatchSnapshot,
  parseWatchSnapshot,
  parseWatchSnapshotJson,
  resolveWatchInput,
  WATCH_PATH,
  WATCH_PROTOCOL,
} from './protocol'
import { probeWatchUrl, scanWatchNetwork, watchEndpoints } from './scan'

describe('watch protocol', () => {
  it('builds a labeled snapshot without undo history', () => {
    const state = winPoint(freshSingles(), 'a')
    const snap = buildWatchSnapshot({
      matchId: 'm1',
      playerNames: { p1: 'Ada', p2: 'Bea' },
      state,
      theme: 'wimbledon',
      updatedAt: 9,
    })
    expect(snap.protocol).toBe(WATCH_PROTOCOL)
    expect(snap.label).toBe('Ada vs Bea')
    expect(snap).not.toHaveProperty('undoHistory')
    expect(parseWatchSnapshot(snap)).toEqual(snap)
  })

  it('rejects a forged or incomplete payload', () => {
    expect(parseWatchSnapshot({ protocol: 'nope' })).toBeNull()
    expect(parseWatchSnapshotJson('not-json')).toBeNull()
    expect(resolveWatchInput('192.168.1.12:5173')).toEqual([
      'http://192.168.1.12:5173/__setpoint/watch',
    ])
    expect(resolveWatchInput('10.0.0.4')).toHaveLength(3)
    expect(
      parseWatchSnapshot({
        protocol: WATCH_PROTOCOL,
        version: 1,
        matchId: 'm1',
        label: 'Ada vs Bea',
        updatedAt: 1,
        theme: 'wimbledon',
        playerNames: { p1: 'Ada' },
        state: { isComplete: false },
      }),
    ).toBeNull()
  })
})

describe('watch http', () => {
  it('accepts only read verbs on the watch path', () => {
    expect(parseWatchHttpRequest(`GET ${WATCH_PATH} HTTP/1.1\r\n\r\n`)).toEqual({
      method: 'GET',
      path: WATCH_PATH,
    })
    expect(parseWatchHttpRequest(`HEAD ${WATCH_PATH}?x=1 HTTP/1.0\r\n\r\n`)).toEqual({
      method: 'HEAD',
      path: WATCH_PATH,
    })
    expect(parseWatchHttpRequest(`POST ${WATCH_PATH} HTTP/1.1\r\n\r\n`)).toBe('invalid')
    expect(parseWatchHttpRequest(`GET /score HTTP/1.1\r\n\r\n`)).toBe('invalid')
    expect(parseWatchHttpRequest(`PUT ${WATCH_PATH} HTTP/1.1\r\n{"points":1}\r\n`)).toBe('invalid')
  })

  it('writes CORS and the watch header', () => {
    const ok = watchHttpJson('{"protocol":"setpoint-watch"}')
    expect(ok).toContain('x-setpoint-watch: 1')
    expect(ok).toContain('Access-Control-Allow-Origin: *')
    expect(ok).toContain('Access-Control-Allow-Methods: GET, HEAD, OPTIONS')
    expect(watchHttpEmpty(204, 'No Content')).toContain('204 No Content')
  })
})

describe('watch scan', () => {
  it('enumerates private subnet endpoints', () => {
    expect(isPrivateIpv4('192.168.1.12')).toBe(true)
    expect(isPrivateIpv4('8.8.8.8')).toBe(false)
    expect(ipv4SubnetBase('10.0.0.8')).toBe('10.0.0')
    expect(subnetHosts('192.168.4', '192.168.4.12')).toHaveLength(253)
    const urls = watchEndpoints({ bases: ['192.168.1'], ports: [47821], skipHost: '192.168.1.1' })
    expect(urls[0]).toBe('http://192.168.1.2:47821/__setpoint/watch')
    expect(urls).toHaveLength(253)
  })

  it('keeps the first snapshot per match id', async () => {
    const state = freshSingles()
    const snap = buildWatchSnapshot({
      matchId: 'm1',
      playerNames: { p1: 'Ada', p2: 'Bea' },
      state,
      theme: 'usOpen',
      updatedAt: 3,
    })
    const fetchFn = async (url: string) => {
      if (url.includes('192.168.1.4') || url.includes('192.168.1.9')) {
        return { ok: true, status: 200, text: async () => JSON.stringify(snap) }
      }
      return { ok: false, status: 404, text: async () => '' }
    }
    const found = await scanWatchNetwork({
      bases: ['192.168.1'],
      ports: [47821],
      fetchFn,
      timeoutMs: 20,
      concurrency: 64,
    })
    expect(found).toHaveLength(1)
    expect(found[0]?.snapshot.label).toBe('Ada vs Bea')
  })

  it('ignores a timed-out probe', async () => {
    const hit = await probeWatchUrl(
      'http://192.168.1.3:47821/__setpoint/watch',
      15,
      async (_url, init) => {
        await new Promise<void>((_, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')))
        })
        return { ok: true, status: 200, text: async () => '' }
      },
    )
    expect(hit).toBeNull()
  })
})
