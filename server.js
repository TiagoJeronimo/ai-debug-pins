// The notes endpoint and the client's files, as one request handler: used by the Vite plugin (under /@ai-debug-pins/)
// and by the standalone server (bin.js, at the root) for pages that are not built by Vite.
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { saveNote } from './notes.js'

const FILES = {
  'client.js': new URL('./client.js', import.meta.url),
  'modern-screenshot.js': new URL(import.meta.resolve('modern-screenshot')),
}

// A note ends up in front of an AI agent that is told to act on it, so it is taken only from a page on this machine:
// the request must come from this machine (not the network, even when the dev server listens there) and from a local
// page (not another site open in the same browser, nor one rebinding its DNS to 127.0.0.1).
const local = (origin) => {
  try {
    const { hostname } = new URL(origin)
    return ['localhost', '127.0.0.1', '[::1]'].includes(hostname) || hostname.endsWith('.localhost')
  } catch {
    return false
  }
}
const loopback = (ip = '') => ip === '::1' || /^(::ffff:)?127\./.test(ip)
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const MAX = 32 * 1024 * 1024 // a picture of a 4K screen at 2x is about 10 MB as base64

// Whether the Claude Code plugin is installed, which is what carries notes into the chat. Without it notes are only
// saved, so the button and the server say so instead of promising Claude will see them.
export async function claudePlugin() {
  const file = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude'), 'plugins', 'installed_plugins.json')
  const list = await readFile(file, 'utf8').then(JSON.parse, () => null)
  return Object.keys(list?.plugins ?? {}).some((k) => k.startsWith('ai-debug-pins@'))
}
export const HINT =
  'ai-debug-pins: notes are saved in .notes/. To have them go to Claude Code by themselves: ' +
  'claude plugin marketplace add TiagoJeronimo/ai-debug-pins && claude plugin install ai-debug-pins@ai-debug-pins'

export function handler({ dir = '.notes', prefix = '/', log = console.log } = {}) {
  const out = resolve(process.cwd(), dir)
  return async (req, res, next = () => send(res, 404, { error: 'not found' })) => {
    const path = req.url?.split('?')[0] ?? ''
    if (!path.startsWith(prefix)) return next()
    const name = path.slice(prefix.length)
    const origin = req.headers.origin
    const allowed = local(origin) && loopback(req.socket.remoteAddress)
    if (allowed) {
      res.setHeader('access-control-allow-origin', origin)
      res.setHeader('access-control-allow-headers', 'content-type')
      res.setHeader('vary', 'origin')
    }
    if (req.method === 'GET' && FILES[name]) {
      res.setHeader('content-type', 'text/javascript')
      return res.end(await readFile(FILES[name]))
    }
    if (name !== 'note') return next()
    if (!allowed) return send(res, 403, { error: 'notes are taken only from pages on this machine' })
    if (req.method === 'OPTIONS') return res.writeHead(204).end()
    if (req.method !== 'POST') return next()
    if (!/^application\/json\b/.test(req.headers['content-type'] ?? '')) return send(res, 415, { error: 'JSON only' })
    try {
      const body = JSON.parse(await text(req))
      if (typeof body?.note !== 'string') return send(res, 400, { error: 'no note' })
      const png = typeof body.png === 'string' ? Buffer.from(body.png, 'base64') : null
      if (png && !png.subarray(0, 8).equals(PNG)) return send(res, 400, { error: 'the picture is not a PNG' })
      const id = await saveNote(out, { ...body, time: undefined }, png)
      log(`ai-debug-pins: ${dir}/notes.md ← ${id}`)
      send(res, 200, { id, dir, claude: await claudePlugin() })
    } catch (e) {
      send(res, e.status ?? 500, { error: e.message })
    }
  }
}

function text(req) {
  return new Promise((ok, no) => {
    let s = ''
    req.setEncoding('utf8')
    req.on('data', (d) => {
      s += d
      if (s.length > MAX) no(Object.assign(new Error('too large'), { status: 413 })), req.destroy()
    })
    req.on('end', () => ok(s))
    req.on('error', no)
  })
}

function send(res, status, json) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(json))
}
