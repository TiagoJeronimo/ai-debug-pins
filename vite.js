// The Vite plugin: puts the note button on every page of the dev server and saves what it sends.
// apply: 'serve', so nothing of it reaches a production build.
import { readFile, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { saveNote } from './notes.js'

const CLIENT = '/@pinnotes/client.js'

export default function pinnotes({ dir = '.notes' } = {}) {
  const out = resolve(process.cwd(), dir)
  return {
    name: 'pinnotes',
    apply: 'serve',
    transformIndexHtml: () => [{ tag: 'script', attrs: { type: 'module', src: CLIENT }, injectTo: 'body' }],
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === CLIENT) {
          res.setHeader('content-type', 'text/javascript')
          return res.end(await readFile(new URL('./client.js', import.meta.url)))
        }
        if (req.method !== 'POST' || !req.url?.startsWith('/@pinnotes/')) return next()
        // Only the dev page itself may write notes or take pictures of the screen: never another site open in the browser.
        const origin = req.headers.origin
        if (!origin || new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'wrong origin' })
        try {
          const body = JSON.parse(await text(req))
          if (req.url === '/@pinnotes/shot') {
            res.setHeader('content-type', 'image/png')
            return res.end(await screenshot(body))
          }
          if (req.url === '/@pinnotes/note') {
            const png = body.png ? Buffer.from(body.png, 'base64') : null
            const id = await saveNote(out, body, png)
            server.config.logger.info(`pinnotes: ${dir}/notes.md ← ${id}`)
            return send(res, 200, { id, dir })
          }
          next()
        } catch (e) {
          send(res, 500, { error: e.message })
        }
      })
    },
  }
}

// A real picture of the screen, so that what Claude sees is exactly what you saw. macOS only for now.
async function screenshot({ x, y, w, h }) {
  if (process.platform !== 'darwin') throw new Error('pictures are taken on macOS only, for now')
  const rect = [x, y, w, h].map((n) => Math.round(Number(n)))
  if (rect.some((n) => !Number.isFinite(n)) || rect[2] < 1 || rect[3] < 1) throw new Error('bad rectangle')
  const file = join(tmpdir(), `pinnotes-${process.pid}-${Date.now()}.png`)
  try {
    await new Promise((ok, no) =>
      execFile('screencapture', ['-x', '-t', 'png', '-R', rect.join(','), file], (e, _, err) =>
        e ? no(new Error(
          `${String(err).trim() || e.message}. Give the app that runs the dev server (your terminal) Screen Recording ` +
          'permission in System Settings › Privacy & Security, then restart it.',
        )) : ok(),
      ),
    )
    return await readFile(file)
  } finally {
    await rm(file, { force: true })
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
