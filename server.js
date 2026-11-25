// The notes endpoint and the client's files, as one request handler: used by the Vite plugin (under /@ai-debug-pins/)
// and by the standalone server (bin.js, at the root) for pages that are not built by Vite.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { saveNote } from './notes.js'

const FILES = {
  'client.js': new URL('./client.js', import.meta.url),
  'modern-screenshot.js': new URL(import.meta.resolve('modern-screenshot')),
}

// Notes may come only from pages on this machine, never from another site open in the same browser.
const local = (origin) => {
  try {
    const { hostname } = new URL(origin)
    return ['localhost', '127.0.0.1', '[::1]'].includes(hostname) || hostname.endsWith('.localhost')
  } catch {
    return false
  }
}

export function handler({ dir = '.notes', prefix = '/', log = console.log } = {}) {
  const out = resolve(process.cwd(), dir)
  return async (req, res, next = () => send(res, 404, { error: 'not found' })) => {
    const path = req.url?.split('?')[0] ?? ''
    if (!path.startsWith(prefix)) return next()
    const name = path.slice(prefix.length)
    const origin = req.headers.origin
    const allowed = !origin || origin === `http://${req.headers.host}` || local(origin)
    if (origin && allowed) {
      res.setHeader('access-control-allow-origin', origin)
      res.setHeader('access-control-allow-headers', 'content-type')
      res.setHeader('vary', 'origin')
    }
    if (req.method === 'GET' && FILES[name]) {
      res.setHeader('content-type', 'text/javascript')
      return res.end(await readFile(FILES[name]))
    }
    if (name !== 'note') return next()
    if (!origin || !allowed) return send(res, 403, { error: 'notes are taken only from pages on this machine' })
    if (req.method === 'OPTIONS') return res.writeHead(204).end()
    if (req.method !== 'POST') return next()
    try {
      const body = JSON.parse(await text(req))
      const id = await saveNote(out, body, body.png ? Buffer.from(body.png, 'base64') : null)
      log(`ai-debug-pins: ${dir}/notes.md ← ${id}`)
      send(res, 200, { id, dir })
    } catch (e) {
      send(res, 500, { error: e.message })
    }
  }
}

function text(req) {
  return new Promise((ok, no) => {
    let s = ''
    req.setEncoding('utf8')
    req.on('data', (d) => (s += d))
    req.on('end', () => ok(s))
    req.on('error', no)
  })
}

function send(res, status, json) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(json))
}
