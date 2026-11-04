/**
 * Tiny HTTP/1.1 helpers for the native watch host.
 * Only GET / HEAD / OPTIONS on WATCH_PATH — no scoring verbs.
 */
import { WATCH_HEADER, WATCH_PATH } from './protocol'

const MAX_REQUEST_BYTES = 8_192

export type WatchHttpRequest = {
  method: 'GET' | 'HEAD' | 'OPTIONS'
  path: string
}

export function parseWatchHttpRequest(raw: string): WatchHttpRequest | 'too-large' | 'invalid' {
  if (raw.length > MAX_REQUEST_BYTES) return 'too-large'
  const headerEnd = raw.indexOf('\r\n\r\n')
  if (headerEnd === -1) return 'invalid'
  const line = raw.slice(0, raw.indexOf('\r\n'))
  const match = /^(GET|HEAD|OPTIONS) (\S+) HTTP\/1\.[01]$/i.exec(line)
  if (!match) return 'invalid'
  const method = match[1].toUpperCase() as WatchHttpRequest['method']
  let path = match[2]
  const q = path.indexOf('?')
  if (q >= 0) path = path.slice(0, q)
  if (path !== WATCH_PATH) return 'invalid'
  return { method, path }
}

export function watchHttpResponse(args: {
  status: number
  reason: string
  body?: string
  contentType?: string
}): string {
  const body = args.body ?? ''
  const headers = [
    `HTTP/1.1 ${args.status} ${args.reason}`,
    `${WATCH_HEADER}: 1`,
    'Access-Control-Allow-Origin: *',
    'Access-Control-Allow-Methods: GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers: Content-Type',
    'Access-Control-Max-Age: 600',
    'Cache-Control: no-store',
    'Connection: close',
  ]
  if (args.contentType) {
    headers.push(`Content-Type: ${args.contentType}`)
  }
  headers.push(`Content-Length: ${utf8ByteLength(body)}`)
  return `${headers.join('\r\n')}\r\n\r\n${body}`
}

export function watchHttpJson(body: string): string {
  return watchHttpResponse({
    status: 200,
    reason: 'OK',
    body,
    contentType: 'application/json; charset=utf-8',
  })
}

export function watchHttpEmpty(status: number, reason: string): string {
  return watchHttpResponse({ status, reason })
}

/** Node Buffer is not on React Native — byte length for UTF-8 JSON. */
export function utf8ByteLength(text: string): number {
  let bytes = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code <= 0x7f) bytes += 1
    else if (code <= 0x7ff) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4
      i += 1
    } else bytes += 3
  }
  return bytes
}
