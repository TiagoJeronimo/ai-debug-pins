// The button in a real browser, driven the way a person uses it: real mouse and keys through Chrome's debugging
// protocol, no test library. Skipped where there is no Chrome (set CHROME to its path if it is somewhere else).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handler } from '../server.js'

const CHROME = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p))

const PAGE = `<!doctype html><meta charset="utf-8"><style>body { margin: 0; font: 16px sans-serif }</style>
<h1 style="margin: 40px">A heading</h1>
<p id="para" style="margin: 40px">Some words to select</p>
<button id="go" style="position: absolute; left: 600px; top: 300px; width: 120px; height: 40px">Go</button>
<script>addEventListener('keydown', (e) => (window.keys = (window.keys ?? '') + e.key))</script>
<script type="module" src="/@ai-debug-pins/client.js"></script>`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

test('pinning in a real browser: a click, an area, several with Shift, selected text, the shortcut', { skip: !CHROME && 'no Chrome' }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'ai-debug-pins-'))
  const dir = join(root, '.notes')
  const notes = handler({ dir, prefix: '/@ai-debug-pins/', log: () => {} })
  const server = createServer((req, res) => notes(req, res, () => res.setHeader('content-type', 'text/html').end(PAGE)))
  server.listen(0, '127.0.0.1')
  await new Promise((r) => server.once('listening', r))
  const port = 9300 + Math.floor(Math.random() * 600)
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(root, 'chrome')}`,
    '--window-size=1000,700', 'about:blank'], { stdio: 'ignore' })
  t.after(async () => {
    chrome.kill()
    server.close()
    await sleep(200)
    await rm(root, { recursive: true, force: true })
  })

  let tabs
  for (let i = 0; i < 50 && !tabs; i++) {
    await sleep(200)
    tabs = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json(), () => null)
  }
  const ws = new WebSocket(tabs.find((x) => x.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  t.after(() => ws.close())
  let id = 0
  const waiting = new Map()
  const errors = []
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    waiting.get(m.id)?.(m.result)
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description)
  }
  const cdp = (method, params = {}) => new Promise((r) => (waiting.set(++id, r), ws.send(JSON.stringify({ id, method, params }))))
  const js = async (expression) => (await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value
  const ui = (s) => js(`(() => { const el = document.querySelector('ai-debug-pins-ui').shadowRoot.querySelector('${s}'); return el && !el.hidden })()`)
  const SHIFT = 8, ALT = 1
  const mouse = (type, x, y, modifiers = 0) => cdp('Input.dispatchMouseEvent', { type, x, y, modifiers, button: 'left', clickCount: 1 })
  const click = async (x, y, modifiers) => {
    await mouse('mouseMoved', x, y, modifiers)
    await mouse('mousePressed', x, y, modifiers)
    await mouse('mouseReleased', x, y, modifiers)
    await sleep(100)
  }
  const key = async (code, key, modifiers = 0) => {
    for (const type of ['rawKeyDown', 'keyUp']) {
      await cdp('Input.dispatchKeyEvent', { type, code, key, modifiers, windowsVirtualKeyCode: key.length === 1 ? key.charCodeAt(0) : { Enter: 13, Escape: 27, Shift: 16 }[key] })
    }
    await sleep(100)
  }
  const shortcut = () => key('KeyP', 'P', ALT | SHIFT)
  // Writes the note, sends it, and waits for the server to have saved it.
  let saved = 0
  const pin = async (words) => {
    await cdp('Input.insertText', { text: words })
    await key('Enter', 'Enter')
    saved++
    for (let i = 0; i < 100; i++) {
      const md = await readFile(join(dir, 'notes.md'), 'utf8').catch(() => '')
      if ((md.match(/^## /gm) ?? []).length === saved) return md.split(/(?=^## )/m).at(-1)
      await sleep(100)
    }
    assert.fail('the note was never saved: ' + words)
  }

  await cdp('Runtime.enable')
  await cdp('Page.navigate', { url: `http://localhost:${server.address().port}/` })
  for (let i = 0; i < 50 && !(await js(`!!document.querySelector('ai-debug-pins-ui')`)); i++) await sleep(100)

  // A click on one thing.
  const fab = await js(`(() => { const r = document.querySelector('ai-debug-pins-ui').shadowRoot.querySelector('.fab').getBoundingClientRect(); return [r.x + 20, r.y + 20] })()`)
  await click(...fab)
  assert.ok(await ui('.hint'), 'the hint shows while picking')
  await click(660, 320)
  assert.ok(await ui('.card'), 'the card opens on a click')
  let note = await pin('Make it bigger')
  assert.match(note, /> Make it bigger/)
  assert.match(note, /- point: 660, 320/)
  assert.match(note, /- element: `#go`/)
  assert.match(note, /- text: "Go"/)
  assert.equal(await js('window.keys ?? ""'), '', 'keys typed into the note never reach the page')

  // The shortcut, then an area dragged.
  await shortcut()
  assert.ok(await ui('.hint'), 'the shortcut starts picking')
  await mouse('mousePressed', 20, 20)
  for (let i = 1; i <= 4; i++) await mouse('mouseMoved', 20 + i * 100, 20 + i * 30)
  await mouse('mouseReleased', 420, 140)
  await sleep(100)
  note = await pin('Too much space')
  assert.match(note, /- area: 20, 20, 400x120 \(the frame/)

  // Several with Shift: letting go of it opens the card.
  await shortcut()
  await click(100, 60, SHIFT)
  await click(660, 320, SHIFT)
  assert.ok(!(await ui('.card')), 'no card while Shift is held')
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', code: 'ShiftLeft', key: 'Shift', windowsVirtualKeyCode: 16 })
  await sleep(100)
  assert.ok(await ui('.card'), 'letting go of Shift opens the card')
  note = await pin('Line these up')
  assert.match(note, /- mark 1:\n  - point: 100, 60 .*\n  - element: `html > body > h1`/)
  assert.match(note, /- mark 2:\n  - point: 660, 320 .*\n  - element: `#go`/)

  // Text selected first: straight to the card, about those words.
  await js(`getSelection().selectAllChildren(document.getElementById('para'))`)
  await shortcut()
  assert.ok(await ui('.card'), 'a selection skips picking')
  note = await pin('Reword this')
  assert.match(note, /- area: /)
  assert.match(note, /- text: "Some words to select"/)

  // Escape cancels; a click beside an empty note closes it.
  await js(`getSelection().removeAllRanges()`)
  await shortcut()
  await key('Escape', 'Escape')
  assert.ok(!(await ui('.layer')), 'Escape stops picking')
  await shortcut()
  await click(660, 320)
  await click(50, 600)
  assert.ok(!(await ui('.card')), 'a click beside an empty note closes it')

  const files = await readdir(dir)
  assert.equal(files.filter((f) => f.endsWith('.png')).length, 4, 'every note has its picture')
  assert.deepEqual(errors, [])
})
