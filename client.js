// The note button. Plain DOM, no framework, so it works on any page. Its UI lives in a shadow root, left out of the
// picture.
// Notes go back to whichever server this file came from: the Vite plugin, or the standalone server on another port.
const POST = (path, body) =>
  fetch(new URL(path, import.meta.url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

const RED = '#e5484d'
const PIN = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.8-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>`

// Option on a Mac types a character instead (∏), so the shortcut is read from the key's place, not what it types.
const KEY = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌥⇧P' : 'Alt+Shift+P'

const host = document.createElement('ai-debug-pins-ui')
const ui = host.attachShadow({ mode: 'open' })
// Dark and small, so it reads on any page and is not mistaken for part of it.
ui.innerHTML = `<style>
  :host { all: initial; font: 13px/1.45 ui-sans-serif, system-ui, -apple-system, sans-serif; color: #fafafa;
    --bg: #18181b; --line: #3f3f46; --dim: #a1a1aa; }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  .top { z-index: 2147483647; position: fixed; }
  .fab { right: 16px; bottom: 16px; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%;
    border: 1px solid var(--line); background: var(--bg); color: #fafafa; cursor: pointer;
    box-shadow: 0 4px 14px #0005; transition: transform .12s, background .12s; }
  .fab:hover { transform: scale(1.06); }
  .fab:focus-visible, button:focus-visible, textarea:focus-visible { outline: 2px solid ${RED}; outline-offset: 2px; }
  .fab[aria-pressed='true'] { background: ${RED}; border-color: ${RED}; }
  .layer { position: fixed; inset: 0; z-index: 2147483646; cursor: crosshair; }
  .layer.open { cursor: default; }
  .card.shake { animation: shake .3s; }
  @keyframes shake { 25% { translate: -6px; } 50% { translate: 5px; } 75% { translate: -3px; } }
  .hint { top: 14px; left: 50%; transform: translateX(-50%); padding: 7px 14px; border-radius: 999px;
    background: var(--bg); border: 1px solid var(--line); box-shadow: 0 4px 14px #0005; pointer-events: none;
    white-space: nowrap; }
  kbd { font: inherit; font-size: 11px; padding: 1px 5px; border: 1px solid var(--line); border-radius: 4px; color: var(--dim); }
  .hl { border: 2px solid ${RED}; background: #e5484d1a; border-radius: 3px; pointer-events: none; z-index: 2147483646; }
  .tag { position: absolute; left: -2px; bottom: 100%; margin-bottom: 4px; padding: 1px 6px; border-radius: 4px;
    background: ${RED}; color: #fff; font-size: 11px; white-space: nowrap; }
  /* No room above (a full-screen canvas): the tag goes inside the outline. */
  .hl.low .tag { bottom: auto; top: 4px; left: 4px; margin: 0; }
  .dot { width: 28px; height: 28px; margin: -14px; border-radius: 50%; border: 3.5px solid ${RED};
    box-shadow: 0 0 0 2px #fff, 0 0 0 3px #0006; pointer-events: none; }
  .box { border: 3px solid ${RED}; border-radius: 4px; box-shadow: 0 0 0 2px #fff, 0 0 0 3px #0006;
    pointer-events: none; }
  .drag { border: 2px dashed ${RED}; background: #e5484d1a; pointer-events: none; z-index: 2147483646; }
  /* Numbered only when the note is about more than one thing, as they are in the picture. */
  .n { display: none; position: absolute; left: 100%; top: -12px; min-width: 18px; padding: 0 5px; border-radius: 9px;
    background: ${RED}; color: #fff; font-size: 11px; font-weight: 700; text-align: center; }
  .marks:has(> * + *) .n { display: block; }
  .card { width: 320px; padding: 10px; border-radius: 12px; background: var(--bg); border: 1px solid var(--line);
    box-shadow: 0 10px 30px #0006; animation: in .12s ease-out; }
  @keyframes in { from { opacity: 0; transform: translateY(4px); } }
  .about { display: flex; gap: 6px; align-items: center; color: var(--dim); font-size: 12px; margin: 0 2px 8px;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .about b { color: #fafafa; font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
  textarea { display: block; width: 100%; min-height: 64px; max-height: 200px; resize: vertical; padding: 8px 10px;
    border-radius: 8px; border: 1px solid var(--line); background: #09090b; color: #fafafa; font: inherit; }
  textarea::placeholder { color: #71717a; }
  .foot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; color: var(--dim);
    font-size: 11px; }
  .send { padding: 5px 12px; border-radius: 7px; border: 0; background: ${RED}; color: #fff; font: inherit;
    font-weight: 600; cursor: pointer; }
  .send:disabled { opacity: .4; cursor: default; }
  .toast { right: 70px; bottom: 22px; max-width: 420px; padding: 7px 12px; border-radius: 8px; background: var(--bg);
    border: 1px solid var(--line); box-shadow: 0 4px 14px #0005; animation: in .12s ease-out; }
  .toast.bad { border-color: ${RED}; }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
</style>
<button class="fab top" title="Pin a note (${KEY})" aria-label="Pin a note" aria-keyshortcuts="Alt+Shift+P"
  aria-pressed="false">${PIN}</button>
<div class="layer" hidden></div>
<div class="hint top" hidden>Click what your note is about · drag for an area · <kbd>Shift</kbd> for several · <kbd>Esc</kbd></div>
<div class="hl top" hidden><span class="tag"></span></div>
<div class="drag top" hidden></div>
<div class="marks"></div>
<form class="card top" hidden>
  <div class="about">On <b></b></div>
  <textarea placeholder="What should change?" aria-label="Note" rows="3"></textarea>
  <div class="foot"><span><kbd>Enter</kbd> pin · <kbd>Shift</kbd>+<kbd>Enter</kbd> new line · <kbd>Esc</kbd></span>
    <button class="send" type="submit" disabled>Pin</button></div>
</form>
<div class="toast top" role="status" hidden></div>`
document.documentElement.append(host)
// Keys typed into the note stay in the note: a game listening on the window would otherwise move its camera on WASD.
// Stopped on the host, which they pass on their way out of the shadow root, before any listener on the page sees them.
for (const type of ['keydown', 'keyup', 'keypress']) host.addEventListener(type, (e) => e.stopPropagation())

const $ = (s) => ui.querySelector(s)
const [fab, layer, hint, hl, drag, marks, card, input, toast] =
  ['.fab', '.layer', '.hint', '.hl', '.drag', '.marks', '.card', 'textarea', '.toast'].map($)
const send = $('.send')
// What the note is about: points clicked ({x, y}) and areas dragged or text selected ({x, y, w, h}), each with the
// element there.
let picks = []
let open = false // the card is up
let down = null // where a press began, to tell a click from a drag

const reset = () => {
  picks = []
  open = false
  down = null
  marks.replaceChildren()
  for (const el of [layer, hint, hl, drag, card]) el.hidden = true
  layer.classList.remove('open')
  input.value = ''
  send.disabled = true
  fab.setAttribute('aria-pressed', 'false')
}
// Shown for a few seconds; ms 0 keeps it up until the next message replaces it.
const say = (text, bad = false, ms = bad ? 9000 : 5000) => {
  toast.textContent = text
  toast.classList.toggle('bad', bad)
  toast.hidden = false
  clearTimeout(say.t)
  if (ms) say.t = setTimeout(() => (toast.hidden = true), ms)
}

// Text selected on the page when pinning starts is what the note is about: no picking.
const selected = () => {
  const s = getSelection()
  if (!s?.rangeCount || s.isCollapsed) return null
  const range = s.getRangeAt(0)
  const r = range.getBoundingClientRect()
  const text = s.toString().trim()
  if (!text || !r.width) return null
  let el = range.commonAncestorContainer
  if (el.nodeType !== 1) el = el.parentElement
  return { x: r.left, y: r.top, w: r.width, h: r.height, el, text: text.slice(0, 500) }
}
const start = (sel) => {
  if (fab.getAttribute('aria-pressed') === 'true') return reset()
  fab.setAttribute('aria-pressed', 'true')
  if (sel) return add(sel, true)
  layer.hidden = hint.hidden = false
}
// Read on the press: by the click, pressing the button may have cleared the selection.
let sel = null
fab.onpointerdown = () => (sel = selected())
fab.onclick = () => start(sel)
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !layer.hidden) return reset()
  // Not while a note is being written: it would lose the words.
  if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyP' && !open) {
    e.preventDefault()
    e.stopPropagation()
    start(selected())
  }
}, true)
input.oninput = () => (send.disabled = !input.value.trim())
input.onkeydown = (e) => {
  if (e.key === 'Escape') reset()
  // Enter pins, Shift+Enter is a new line; not while composing a character with an input method.
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) e.preventDefault(), card.requestSubmit()
}

// The page's element under a point, looking through the note's own UI.
const under = (x, y) => document.elementsFromPoint(x, y).find((el) => el !== host) ?? null
const name = (el) => {
  const c = react(el)
  const tag = el.localName + (el.id ? '#' + el.id : el.classList[0] ? '.' + el.classList[0] : '')
  return c ? `${c.names[0]} · ${tag}` : tag
}

// While picking, the element under the pointer lights up with its name, so it is clear what the note will be about.
let frame = 0
layer.onpointermove = (e) => {
  if (open) return
  if (down && (Math.abs(e.clientX - down.x) > 6 || Math.abs(e.clientY - down.y) > 6)) {
    const b = box(down, e)
    Object.assign(drag.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' })
    drag.hidden = false
    return (hl.hidden = true)
  }
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const el = under(e.clientX, e.clientY)
    if (!el || el === document.documentElement || el === document.body) return (hl.hidden = true)
    const r = el.getBoundingClientRect()
    Object.assign(hl.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' })
    hl.classList.toggle('low', r.top < 24)
    hl.firstChild.textContent = name(el)
    hl.hidden = false
  })
}
layer.onpointerleave = () => (hl.hidden = true)

const box = (a, b) => ({
  x: Math.min(a.x, b.clientX), y: Math.min(a.y, b.clientY), w: Math.abs(b.clientX - a.x), h: Math.abs(b.clientY - a.y),
})
// The smallest element holding the whole area.
const around = (b) => {
  let el = under(b.x + b.w / 2, b.y + b.h / 2)
  const holds = (r) => r.left <= b.x + 1 && r.top <= b.y + 1 && r.right >= b.x + b.w - 1 && r.bottom >= b.y + b.h - 1
  while (el?.parentElement && !holds(el.getBoundingClientRect())) el = el.parentElement
  return el
}

layer.onpointerdown = (e) => {
  if (open || e.button) return
  down = { x: e.clientX, y: e.clientY }
  layer.setPointerCapture(e.pointerId)
}
layer.onpointerup = (e) => {
  // A click beside an open note never reaches the page. With nothing typed it closes the note; with words typed it
  // keeps them (a stray click should not lose a sentence) and nudges the card instead.
  if (open) {
    if (!input.value.trim()) return reset()
    card.classList.remove('shake')
    void card.offsetWidth // restarts the animation on a second stray click
    card.classList.add('shake')
    return input.focus()
  }
  if (!down) return
  cancelAnimationFrame(frame)
  const dragged = !drag.hidden
  const b = box(down, e)
  down = null
  drag.hidden = true
  // Shift keeps picking: one note about several things.
  add(dragged ? { ...b, el: around(b) } : { x: e.clientX, y: e.clientY, el: under(e.clientX, e.clientY) }, !e.shiftKey)
}

const add = (t, done) => {
  picks.push(t)
  const m = document.createElement('div')
  m.className = (t.w ? 'box' : 'dot') + ' top'
  Object.assign(m.style, { left: t.x + 'px', top: t.y + 'px', width: t.w && t.w + 'px', height: t.h && t.h + 'px' })
  m.innerHTML = `<span class="n">${picks.length}</span>`
  marks.append(m)
  if (done) show()
}
// Letting go of Shift after picking several opens the card: no extra click for the last one.
addEventListener('keyup', (e) => e.key === 'Shift' && picks.length && !open && show(), true)

const show = () => {
  const t = picks.at(-1)
  open = true
  layer.hidden = false
  layer.classList.add('open')
  hint.hidden = hl.hidden = true
  const first = picks[0]
  $('.about b').textContent =
    (first.text ? `“${first.text.slice(0, 40)}${first.text.length > 40 ? '…' : ''}”` : first.el ? name(first.el) : 'the page') +
    (picks.length > 1 ? ` and ${picks.length - 1} more` : '')
  // Beside the last mark, on whichever side has room.
  const x = t.x + (t.w ?? 0), y = t.y
  const w = 320, h = 150
  Object.assign(card.style, {
    left: Math.max(8, x + 20 + w < innerWidth ? x + 20 : t.x - 20 - w) + 'px',
    top: Math.max(8, y + 20 + h < innerHeight ? y + 20 : y - 20 - h) + 'px',
  })
  card.hidden = false
  input.focus()
}

card.onsubmit = async (e) => {
  e.preventDefault()
  const p = picks
  if (!p.length || !input.value.trim()) return
  const r = Math.round
  const note = {
    note: input.value,
    url: location.href,
    viewport: `${innerWidth}x${innerHeight}`,
    dpr: devicePixelRatio,
    targets: p.map((t) => ({
      point: t.w ? undefined : `${r(t.x)}, ${r(t.y)}`,
      area: t.w ? `${r(t.x)}, ${r(t.y)}, ${r(t.w)}x${r(t.h)}` : undefined,
      path: cssPath(t.el),
      text: t.text ?? (t.el?.innerText || t.el?.getAttribute?.('aria-label') || t.el?.alt || '').trim().slice(0, 200),
      component: react(t.el),
    })),
  }
  reset()
  say('Pinning…', false, 0)
  try {
    note.png = await withMarks(await picture(), p)
  } catch (err) {
    note.noPicture = String(err?.message ?? err)
  }
  const saved = await POST('note', note).catch(() => null)
  if (!saved || saved.status === 404) return copy(note)
  if (!saved.ok) return say('Not pinned: ' + (await saved.json().catch(() => ({}))).error, true)
  const { claude } = await saved.json().catch(() => ({}))
  if (!note.png) return say('Pinned, without a picture: ' + note.noPicture, true)
  say(claude ? '📍 Pinned. It goes with your next message to Claude.' : '📍 Pinned in .notes/notes.md.')
}

// The page draws its own picture: no permission, no extension. Taken inside a frame, right after the page has drawn,
// when a WebGL canvas still holds its picture (no preserveDrawingBuffer needed). The note's UI is left out.
async function picture() {
  const { domToCanvas } = await import('./modern-screenshot.js')
  // The drawing waits for every image on the page, and an image left to load lazily further down never starts: it
  // would wait half a minute. Asked to load now, they come in a moment from the dev server.
  for (const img of document.images) if (!img.complete && img.loading === 'lazy') img.loading = 'eager'
  // A tab in the background gets no frames: after a moment it is drawn anyway (a WebGL canvas may come out blank).
  const page = await new Promise((ok, no) => {
    let done = false
    const draw = () => {
      if (done) return
      done = true
      domToCanvas(document.documentElement, {
        scale: devicePixelRatio,
        // At least the screen: a page whose content is all fixed (a game) measures zero high.
        width: Math.max(document.documentElement.scrollWidth, innerWidth),
        height: Math.max(document.documentElement.scrollHeight, innerHeight),
        filter: (n) => n !== host,
        // Anything still not loaded after this is drawn without, rather than holding the note up.
        timeout: 3000,
      }).then(ok, no)
    }
    requestAnimationFrame(draw)
    setTimeout(draw, 500)
  })
  // The whole page is drawn; keep the part that was on screen.
  const k = devicePixelRatio
  const c = document.createElement('canvas')
  c.width = innerWidth * k
  c.height = innerHeight * k
  c.getContext('2d').drawImage(page, -scrollX * k, -scrollY * k)
  return c
}

async function withMarks(c, picks) {
  const k = devicePixelRatio
  const g = c.getContext('2d')
  g.scale(k, k)
  picks.forEach((t, i) => {
    // A ring or a frame, not a filled dot, so what was picked stays readable inside it.
    for (const [width, colour] of [[8, '#0009'], [6, '#fff'], [3.5, RED]]) {
      g.beginPath()
      if (t.w) g.roundRect(t.x, t.y, t.w, t.h, 4)
      else g.arc(t.x, t.y, 14, 0, Math.PI * 2)
      g.lineWidth = width
      g.strokeStyle = colour
      g.stroke()
    }
    // Numbered when there are several, as the note lists them.
    if (picks.length < 2) return
    const x = t.w ? t.x + t.w : t.x + 14, y = t.w ? t.y : t.y - 14
    g.beginPath()
    g.arc(x, y, 10, 0, Math.PI * 2)
    g.fillStyle = RED
    g.fill()
    g.lineWidth = 2
    g.strokeStyle = '#fff'
    g.stroke()
    g.fillStyle = '#fff'
    g.font = 'bold 12px system-ui, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(String(i + 1), x, y + 0.5)
  })
  return c.toDataURL('image/png').split(',')[1]
}

// Without the plugin (the client put on a page by hand) there is nowhere to save: the words go to the clipboard
// and the picture to the downloads.
async function copy(note) {
  const { png, targets, ...rest } = note
  if (png) Object.assign(document.createElement('a'), { href: 'data:image/png;base64,' + png, download: 'note.png' }).click()
  const lines = (o) => Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)
  const text = [
    ...lines(rest),
    ...targets.flatMap(({ component: c, ...t }, i) => [
      ...(targets.length > 1 ? [`mark ${i + 1}:`] : []),
      ...lines({ ...t, component: c && c.names.join(' ← ') + (c.file ? ` (${c.file})` : '') }),
    ]),
  ].join('\n')
  // The clipboard can refuse (the page lost focus while the picture was drawn): the picture is still downloaded.
  if (!(await navigator.clipboard.writeText(text).then(() => true, () => false))) return say('Nowhere to save the note, and the clipboard refused it.')
  say('No ai-debug-pins plugin on this server: the note is on the clipboard' + (png ? ', the picture in your downloads.' : '.'))
}

function cssPath(el) {
  const parts = []
  for (let n = el; n?.nodeType === 1 && parts.length < 5; n = n.parentElement) {
    if (n.id) {
      parts.unshift('#' + CSS.escape(n.id))
      break
    }
    let s = n.localName + [...n.classList].slice(0, 2).map((c) => '.' + CSS.escape(c)).join('')
    const same = n.parentElement ? [...n.parentElement.children].filter((x) => x.localName === n.localName) : []
    if (same.length > 1) s += `:nth-of-type(${same.indexOf(n) + 1})`
    parts.unshift(s)
  }
  return parts.join(' > ')
}

// React in development keeps its fiber on the DOM node. The nearest components, and the file the element was
// written in (React 19: the stack of where it was created; React 18 and older: _debugSource).
function react(el) {
  for (let n = el; n; n = n.parentElement) {
    const key = Object.keys(n).find((k) => k.startsWith('__reactFiber$'))
    if (!key) continue
    const names = []
    let file = null
    for (let f = n[key]; f && names.length < 3; f = f.return) {
      const at = source(f)
      // A bundler's chunk (Next.js serves client code from /_next/) is no file anyone can open: names only.
      if (!file && at && !at.startsWith('_next/')) file = at
      // Only components used in the project's own code: a library's insides (CanvasImpl, minified names) say nothing.
      if (!at) continue
      if (typeof f.type === 'function') names.push(f.type.displayName || f.type.name || 'Anonymous')
      else if (f.type?.render) names.push(f.type.displayName || f.type.render.name || 'ForwardRef')
    }
    return names.length ? { names, file } : null
  }
  return null
}

function source(f) {
  if (f._debugSource) return `${f._debugSource.fileName}:${f._debugSource.lineNumber}`
  // React 19 keeps the stack of where the element was made: the first frame is React's own jsx(), the second the
  // component that made it. Its address is the dev server's (Vite: /src/App.tsx), or for a server component a file
  // on disk (Next.js: about://React/Prerender/file:///.../app/page.tsx).
  const frame = String(f._debugStack?.stack ?? '').split('\n').filter((l) => l.trim().startsWith('at '))[1]
  // "at Name (address:line:col)" or "at address:line:col"; the address itself may hold brackets (Turbopack's do).
  const url = frame?.match(/\((.*):\d+:\d+\)\s*$/)?.[1] ?? frame?.match(/at (\S+):\d+:\d+\s*$/)?.[1]
  // Only real addresses: "<anonymous>" and the like belong to no file.
  if (!/^(https?|file|about):\/\//.test(url ?? '')) return null
  // Turbopack names the source inside the address of its chunk, encoded twice: ...?id=%255Bproject%255D/app/page.tsx+...
  const turbo = decodeURIComponent(decodeURIComponent(url)).match(/\[project\]\/([^\s+?]+)/)?.[1]
  if (turbo) return /node_modules/.test(turbo) ? null : turbo
  const path = decodeURI(url.split('?')[0].replace(/^about:\/\/React\/[^/]+\//, ''))
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/^file:\/\//, '')
  // Libraries, also inside a bundler's chunk names (Turbopack's node_modules_next_dist_...), and Vite's own.
  return /node_modules|next_dist|react-dom|^@|\/\.next\//.test(path) ? null : path
}
