import { randomUUID } from 'node:crypto'
/**
 * In-memory LAN watch host for `vite --host` / preview.
 * Scoring tab POSTs snapshots; other devices GET them. POST cannot change
 * the scorer’s Dexie match — only what watchers see.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import { parseWatchSnapshotJson } from './shared/watch/protocol.js'

const WATCH_PATH = '/__setpoint/watch'
const WATCH_HEADER = 'x-setpoint-watch'

const MAX_POST_BYTES = 2_000_000

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_POST_BYTES) {
        reject(new Error('too-large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function send(res: ServerResponse, status: number, body = '', contentType?: string) {
  const headers: Record<string, string> = {
    [WATCH_HEADER]: '1',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  }
  if (contentType) headers['Content-Type'] = contentType
  res.writeHead(status, headers)
  res.end(body)
}

function attachWatchHost(server: { middlewares: Connect.Server }) {
  let snapshot: string | null = null
  const publishKey = randomUUID()
  let owner: string | null = null
  let ownerUntil = 0
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url?.split('?')[0]
    if (url !== WATCH_PATH) {
      next()
      return
    }
    const method = req.method ?? 'GET'
    const sameOrigin =
      req.headers.origin === `http://${req.headers.host}` ||
      req.headers.origin === `https://${req.headers.host}` ||
      req.headers['sec-fetch-site'] === 'same-origin'
    if (method === 'HEAD' && sameOrigin) res.setHeader('x-setpoint-publish-key', publishKey)
    if (method === 'OPTIONS') {
      send(res, 204)
      return
    }
    if (method === 'GET' || method === 'HEAD') {
      if (!snapshot) {
        send(res, 204)
        return
      }
      send(res, 200, method === 'HEAD' ? '' : snapshot, 'application/json; charset=utf-8')
      return
    }
    if (method === 'POST') {
      if (!sameOrigin || req.headers['x-setpoint-publish-key'] !== publishKey) {
        send(res, 403, 'publisher not authorized')
        return
      }
      const publisher = req.headers['x-setpoint-publisher']
      if (typeof publisher !== 'string' || publisher.length < 8 || publisher.length > 80) {
        send(res, 403)
        return
      }
      void readBody(req)
        .then((text) => {
          if (!text) {
            if (owner !== publisher) {
              send(res, 204)
              return
            }
            owner = null
            snapshot = null
            send(res, 204)
            return
          }
          if (!parseWatchSnapshotJson(text)) {
            send(res, 400, 'invalid snapshot')
            return
          }
          if (owner && owner !== publisher && Date.now() < ownerUntil) {
            send(res, 409, 'another scorer is sharing')
            return
          }
          owner = publisher
          ownerUntil = Date.now() + 15000
          snapshot = text
          send(res, 204)
        })
        .catch(() => {
          send(res, 413, 'too large')
        })
      return
    }
    send(res, 405, 'method not allowed')
  }
  server.middlewares.use(middleware)
}

export function setpointWatchPlugin(): Plugin {
  return {
    name: 'setpoint-watch',
    configureServer(server) {
      attachWatchHost(server)
    },
    configurePreviewServer(server) {
      attachWatchHost(server)
    },
  }
}
