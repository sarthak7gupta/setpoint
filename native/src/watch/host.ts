import { NativeModules } from 'react-native'
import {
  parseWatchHttpRequest,
  WATCH_PORT,
  watchHttpEmpty,
  watchHttpJson,
  watchHttpResponse,
  type WatchSnapshot,
} from './index'

type TcpSocketConn = {
  on: (event: string, listener: (data?: string | { toString: () => string }) => void) => void
  end: (data?: string) => void
  destroy: () => void
}

type TcpServer = {
  listen: (options: { port: number; host: string }, callback?: () => void) => void
  close: (callback?: () => void) => void
  on: (event: string, listener: (error?: Error) => void) => void
}

type TcpSocketModule = {
  createServer: (listener: (socket: TcpSocketConn) => void) => TcpServer
}

function loadNativeTcp(): TcpSocketModule | null {
  const natives = NativeModules as Record<string, unknown>
  if (!natives.TcpSockets && !natives.TcpSocketModule) return null
  try {
    const mod = require('react-native-tcp-socket') as TcpSocketModule & {
      default?: TcpSocketModule
    }
    if (typeof mod.createServer === 'function') return mod
    return mod.default ?? null
  } catch {
    return null
  }
}

export function createWatchHost(loadTcp: () => TcpSocketModule | null = loadNativeTcp) {
let snapshot: WatchSnapshot | null = null
let server: TcpServer | null = null
let starting: Promise<'ok' | 'no-native' | 'listen-failed'> | null = null
let finishStart: ((result: 'ok' | 'no-native' | 'listen-failed') => void) | null = null
let generation = 0
let listenState: 'off' | 'starting' | 'on' | 'failed' = 'off'

function watchHostNativeAvailable(): boolean {
  return loadTcp() !== null
}

function setWatchHostSnapshot(next: WatchSnapshot | null) {
  snapshot = next
}

function startWatchServer(): Promise<'ok' | 'no-native' | 'listen-failed'> {
  if (server && listenState === 'on') return Promise.resolve('ok')
  if (starting) return starting
  const token = ++generation
  const tcp = loadTcp()
  if (!tcp) {
    listenState = 'failed'
    return Promise.resolve('no-native')
  }
  listenState = 'starting'
  starting = new Promise((resolve) => {
    finishStart = resolve
    try {
      const next = tcp.createServer((socket) => {
        let buf = ''
        socket.on('data', (data) => {
          buf += typeof data === 'string' ? data : (data?.toString() ?? '')
          if (!buf.includes('\r\n\r\n')) {
            if (buf.length > 8192) socket.end(watchHttpEmpty(413, 'Payload Too Large'))
            return
          }
          const parsed = parseWatchHttpRequest(buf)
          if (parsed === 'too-large') {
            socket.end(watchHttpEmpty(413, 'Payload Too Large'))
            return
          }
          if (parsed === 'invalid') {
            socket.end(watchHttpEmpty(404, 'Not Found'))
            return
          }
          if (parsed.method === 'OPTIONS') {
            socket.end(watchHttpEmpty(204, 'No Content'))
            return
          }
          if (!snapshot) {
            socket.end(watchHttpEmpty(204, 'No Content'))
            return
          }
          if (parsed.method === 'HEAD') {
            socket.end(
              watchHttpResponse({
                status: 200,
                reason: 'OK',
                contentType: 'application/json; charset=utf-8',
              }),
            )
            return
          }
          socket.end(watchHttpJson(JSON.stringify(snapshot)))
        })
        socket.on('error', () => socket.destroy())
      })
      server = next
      next.on('error', () => {
        if (generation !== token) return
        try { next.close() } catch { /* already closed */ }
        starting = null
        listenState = 'failed'
        server = null
        resolve('listen-failed')
      })
      next.listen({ port: WATCH_PORT, host: '0.0.0.0' }, () => {
        if (generation !== token) { try { next.close() } catch { /* stopped during startup */ } ; return }
        starting = null
        listenState = 'on'
        resolve('ok')
      })
    } catch {
      starting = null
      try { server?.close() } catch { /* already closed */ }
      server = null
      listenState = 'failed'
      resolve('listen-failed')
    }
  })
  const pending = starting
  void pending.then(() => { if (starting === pending) starting = null })
  return pending
}

function stopWatchServer() {
  generation++
  finishStart?.('listen-failed')
  finishStart = null
  starting = null
  snapshot = null
  const current = server
  server = null
  listenState = 'off'
  try {
    current?.close()
  } catch {
    /* already closed */
  }
}

return { watchHostNativeAvailable, setWatchHostSnapshot, startWatchServer, stopWatchServer }
}

export const { watchHostNativeAvailable, setWatchHostSnapshot, startWatchServer, stopWatchServer } = createWatchHost()
