// The note button. Plain DOM, no framework, so it works on any page. Its UI lives in a shadow root, left out of the
// picture.
// Notes go back to whichever server this file came from: the Vite plugin, or the standalone server on another port.
const POST = (path, body) =>
  fetch(new URL(path, import.meta.url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

const RED = '#e5484d'
const PIN = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.8-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>`

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
<button class="fab top" title="Pin a note" aria-label="Pin a note" aria-pressed="false">${PIN}</button>
<div class="layer" hidden></div>
<div class="hint top" hidden>Click what your note is about <kbd>Esc</kbd></div>
<div class="hl top" hidden><span class="tag"></span></div>
<div class="dot top" hidden></div>
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
const [fab, layer, hint, hl, dot, card, input, toast] =
  ['.fab', '.layer', '.hint', '.hl', '.dot', '.card', 'textarea', '.toast'].map($)
const send = $('.send')
let pick = null // the click: the point and the element under it

const reset = () => {
  pick = null
  for (const el of [layer, hint, hl, dot, card]) el.hidden = true
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

fab.onclick = () => {
  if (fab.getAttribute('aria-pressed') === 'true') return reset()
  layer.hidden = hint.hidden = false
  fab.setAttribute('aria-pressed', 'true')
}
addEventListener('keydown', (e) => e.key === 'Escape' && !layer.hidden && reset(), true)
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
  if (pick) return
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

layer.onclick = (e) => {
  // A click beside an open note never reaches the page. With nothing typed it closes the note; with words typed it
  // keeps them (a stray click should not lose a sentence) and nudges the card instead.
  if (pick) {
    if (!input.value.trim()) return reset()
    card.classList.remove('shake')
    void card.offsetWidth // restarts the animation on a second stray click
    card.classList.add('shake')
    return input.focus()
  }
  cancelAnimationFrame(frame)
  const el = under(e.clientX, e.clientY)
  pick = { x: e.clientX, y: e.clientY, el }
  layer.classList.add('open')
  hint.hidden = hl.hidden = true
  $('.about b').textContent = el ? name(el) : 'the page'
  Object.assign(dot.style, { left: e.clientX + 'px', top: e.clientY + 'px' })
  // Beside the ring, on whichever side has room.
  const w = 320, h = 150
  Object.assign(card.style, {
    left: Math.max(8, e.clientX + 20 + w < innerWidth ? e.clientX + 20 : e.clientX - 20 - w) + 'px',
    top: Math.max(8, e.clientY + 20 + h < innerHeight ? e.clientY + 20 : e.clientY - 20 - h) + 'px',
  })
  dot.hidden = card.hidden = false
  input.focus()
}

card.onsubmit = async (e) => {
  e.preventDefault()
  const p = pick
  if (!p || !input.value.trim()) return
  const note = {
    note: input.value,
    url: location.href,
    viewport: `${innerWidth}x${innerHeight}`,
    dpr: devicePixelRatio,
    point: `${Math.round(p.x)}, ${Math.round(p.y)}`,
    path: cssPath(p.el),
    text: (p.el?.innerText || p.el?.getAttribute?.('aria-label') || p.el?.alt || '').trim().slice(0, 200),
    component: react(p.el),
  }
  reset()
  say('Pinning…', false, 0)
  try {
    note.png = await withDot(await picture(), p.x, p.y)
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

async function withDot(c, x, y) {
  const k = devicePixelRatio
  const g = c.getContext('2d')
  // A ring, not a filled dot, so what was clicked stays readable inside it.
  for (const [width, colour] of [[8, '#0009'], [6, '#fff'], [3.5, RED]]) {
    g.beginPath()
    g.arc(x * k, y * k, 14 * k, 0, Math.PI * 2)
    g.lineWidth = width * k
    g.strokeStyle = colour
    g.stroke()
  }
  return c.toDataURL('image/png').split(',')[1]
}

// Without the plugin (the client put on a page by hand) there is nowhere to save: the words go to the clipboard
// and the picture to the downloads.
async function copy(note) {
  const { png, component: c, ...rest } = note
  if (png) Object.assign(document.createElement('a'), { href: 'data:image/png;base64,' + png, download: 'note.png' }).click()
  const text = Object.entries({ ...rest, component: c && c.names.join(' ← ') + (c.file ? ` (${c.file})` : '') })
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
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
