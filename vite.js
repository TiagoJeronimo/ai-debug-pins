// The Vite plugin: puts the note button on every page of the dev server and saves what it sends.
// apply: 'serve', so nothing of it reaches a production build.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { saveNote } from './notes.js'

const CLIENT = '/@pinnotes/client.js'
// Served as they are, so the client works whatever the page's own build does.
const FILES = {
  [CLIENT]: new URL('./client.js', import.meta.url),
  '/@pinnotes/modern-screenshot.js': new URL(import.meta.resolve('modern-screenshot')),
}

export default function pinnotes({ dir = '.notes' } = {}) {
  const out = resolve(process.cwd(), dir)
  return {
    name: 'pinnotes',
    apply: 'serve',
    transformIndexHtml: () => [{ tag: 'script', attrs: { type: 'module', src: CLIENT }, injectTo: 'body' }],
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (FILES[req.url]) {
          res.setHeader('content-type', 'text/javascript')
          return res.end(await readFile(FILES[req.url]))
        }
        if (req.method !== 'POST' || !req.url?.startsWith('/@pinnotes/')) return next()
        // Only the dev page itself may write notes: never another site open in the same browser.
        const origin = req.headers.origin
        if (!origin || new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'wrong origin' })
        try {
          const body = JSON.parse(await text(req))
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
