// The note button. Plain DOM, no framework, so it works on any page. Its UI lives in a shadow root, left out of the
// picture.
// Notes go back to whichever server this file came from: the Vite plugin, or the standalone server on another port.
const POST = (path, body) =>
  fetch(new URL(path, import.meta.url), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

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

const find = (selector) => ui.querySelector(selector)
const pinButton = find('.fab')
const layer = find('.layer') // covers the page while picking, so clicks go to the note and not to the page
const hint = find('.hint')
const highlight = find('.hl')
const dragBox = find('.drag')
const marks = find('.marks')
const card = find('.card')
const input = find('textarea')
const sendButton = find('.send')
const toast = find('.toast')

// ---- State ----

// What the note is about: points clicked ({ x, y }), and areas dragged or text selected ({ x, y, w, h }), each with the
// element there. Several when Shift is held.
let picks = []
let cardOpen = false
let pressedAt = null // where a press began, to tell a click from a drag

const picking = () => pinButton.getAttribute('aria-pressed') === 'true'

function reset() {
  picks = []
  cardOpen = false
  pressedAt = null
  marks.replaceChildren()
  for (const el of [layer, hint, highlight, dragBox, card]) el.hidden = true
  layer.classList.remove('open')
  input.value = ''
  sendButton.disabled = true
  pinButton.setAttribute('aria-pressed', 'false')
}

// A message by the pin button for a few seconds; ms 0 keeps it up until the next message replaces it.
function tell(text, bad = false, ms = bad ? 9000 : 5000) {
  toast.textContent = text
  toast.classList.toggle('bad', bad)
  toast.hidden = false
  clearTimeout(tell.timer)
  if (ms) tell.timer = setTimeout(() => (toast.hidden = true), ms)
}

// ---- Starting: the button, the shortcut, a text selection ----

function start(selection) {
  if (picking()) return reset()
  pinButton.setAttribute('aria-pressed', 'true')
  // Text selected on the page is what the note is about: no picking.
  if (selection) return addPick(selection, true)
  layer.hidden = hint.hidden = false
}

// The selected text on the page, as a pick, or null.
function selectedText() {
  const selection = getSelection()
  if (!selection?.rangeCount || selection.isCollapsed) return null
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  const text = selection.toString().trim()
  if (!text || !rect.width) return null
  let el = range.commonAncestorContainer
  if (el.nodeType !== Node.ELEMENT_NODE) el = el.parentElement
  return { x: rect.left, y: rect.top, w: rect.width, h: rect.height, el, text: text.slice(0, 500) }
}

// Read on the press: by the click, pressing the button may have cleared the selection.
let selectionAtPress = null
pinButton.onpointerdown = () => (selectionAtPress = selectedText())
pinButton.onclick = () => start(selectionAtPress)

addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !layer.hidden) return reset()
  // Alt+Shift+P. Not while a note is being written: it would lose the words.
  const shortcut = e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyP'
  if (shortcut && !cardOpen) {
    e.preventDefault()
    e.stopPropagation()
    start(selectedText())
  }
}, true)

// Letting go of Shift after picking several opens the card: no extra click for the last one.
addEventListener('keyup', (e) => {
  if (e.key === 'Shift' && picks.length && !cardOpen) openCard()
}, true)

// ---- Picking: hover, click, drag ----

// The page's element under a point, looking through the note's own UI.
const elementAt = (x, y) => document.elementsFromPoint(x, y).find((el) => el !== host) ?? null

// The smallest element holding the whole area.
function elementAround(area) {
  let el = elementAt(area.x + area.w / 2, area.y + area.h / 2)
  const holds = (r) =>
    r.left <= area.x + 1 && r.top <= area.y + 1 && r.right >= area.x + area.w - 1 && r.bottom >= area.y + area.h - 1
  while (el?.parentElement && !holds(el.getBoundingClientRect())) el = el.parentElement
  return el
}

// What the hover tag and the card call an element: its component, if React says, and its tag.
function label(el) {
  const component = react(el)
  const tag = el.localName + (el.id ? '#' + el.id : el.classList[0] ? '.' + el.classList[0] : '')
  return component ? `${component.names[0]} · ${tag}` : tag
}

const areaBetween = (from, e) => ({
  x: Math.min(from.x, e.clientX),
  y: Math.min(from.y, e.clientY),
  w: Math.abs(e.clientX - from.x),
  h: Math.abs(e.clientY - from.y),
})

const place = (el, { x, y, w, h }) =>
  Object.assign(el.style, { left: x + 'px', top: y + 'px', width: w && w + 'px', height: h && h + 'px' })

// While picking, the element under the pointer lights up with its name, so it is clear what the note will be about.
// While pressing, a box follows the pointer instead.
let hoverFrame = 0
layer.onpointermove = (e) => {
  if (cardOpen) return
  const moved = pressedAt && (Math.abs(e.clientX - pressedAt.x) > 6 || Math.abs(e.clientY - pressedAt.y) > 6)
  if (moved) {
    place(dragBox, areaBetween(pressedAt, e))
    dragBox.hidden = false
    highlight.hidden = true
    return
  }
  cancelAnimationFrame(hoverFrame)
  hoverFrame = requestAnimationFrame(() => {
    const el = elementAt(e.clientX, e.clientY)
    if (!el || el === document.documentElement || el === document.body) return (highlight.hidden = true)
    const rect = el.getBoundingClientRect()
    place(highlight, { x: rect.left, y: rect.top, w: rect.width, h: rect.height })
    highlight.classList.toggle('low', rect.top < 24)
    highlight.firstChild.textContent = label(el)
    highlight.hidden = false
  })
}
layer.onpointerleave = () => (highlight.hidden = true)

layer.onpointerdown = (e) => {
  if (cardOpen || e.button !== 0) return
  pressedAt = { x: e.clientX, y: e.clientY }
  layer.setPointerCapture(e.pointerId)
}

layer.onpointerup = (e) => {
  if (cardOpen) return strayClick()
  if (!pressedAt) return
  cancelAnimationFrame(hoverFrame)
  const dragged = !dragBox.hidden
  const area = areaBetween(pressedAt, e)
  pressedAt = null
  dragBox.hidden = true
  const pick = dragged
    ? { ...area, el: elementAround(area) }
    : { x: e.clientX, y: e.clientY, el: elementAt(e.clientX, e.clientY) }
  // Shift keeps picking: one note about several things.
  addPick(pick, !e.shiftKey)
}

// A click beside an open note never reaches the page. With nothing typed it closes the note; with words typed it
// keeps them (a stray click should not lose a sentence) and nudges the card instead.
function strayClick() {
  if (!input.value.trim()) return reset()
  card.classList.remove('shake')
  void card.offsetWidth // restarts the animation on a second stray click
  card.classList.add('shake')
  input.focus()
}

// A ring for a point, a frame for an area, numbered (by CSS) once there are several.
function addPick(pick, last) {
  picks.push(pick)
  const mark = document.createElement('div')
  mark.className = (pick.w ? 'box' : 'dot') + ' top'
  place(mark, pick)
  mark.innerHTML = `<span class="n">${picks.length}</span>`
  marks.append(mark)
  if (last) openCard()
}

// ---- The card: writing the note ----

function openCard() {
  cardOpen = true
  layer.hidden = false
  layer.classList.add('open')
  hint.hidden = highlight.hidden = true

  const first = picks[0]
  const about = first.text
    ? `“${first.text.slice(0, 40)}${first.text.length > 40 ? '…' : ''}”`
    : first.el ? label(first.el) : 'the page'
  find('.about b').textContent = about + (picks.length > 1 ? ` and ${picks.length - 1} more` : '')

  // Beside the last mark, on whichever side has room.
  const lastPick = picks.at(-1)
  const right = lastPick.x + (lastPick.w ?? 0)
  const width = 320, height = 150
  const left = right + 20 + width < innerWidth ? right + 20 : lastPick.x - 20 - width
  const top = lastPick.y + 20 + height < innerHeight ? lastPick.y + 20 : lastPick.y - 20 - height
  Object.assign(card.style, { left: Math.max(8, left) + 'px', top: Math.max(8, top) + 'px' })
  card.hidden = false
  input.focus()
}

input.oninput = () => (sendButton.disabled = !input.value.trim())
input.onkeydown = (e) => {
  if (e.key === 'Escape') reset()
  // Enter pins, Shift+Enter is a new line; not while composing a character with an input method.
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    card.requestSubmit()
  }
}

// ---- Saving: the picture, then the server ----

card.onsubmit = async (e) => {
  e.preventDefault()
  const pinned = picks
  if (!pinned.length || !input.value.trim()) return
  const round = Math.round
  const note = {
    note: input.value,
    url: location.href,
    viewport: `${innerWidth}x${innerHeight}`,
    dpr: devicePixelRatio,
    targets: pinned.map((pick) => ({
      point: pick.w ? undefined : `${round(pick.x)}, ${round(pick.y)}`,
      area: pick.w ? `${round(pick.x)}, ${round(pick.y)}, ${round(pick.w)}x${round(pick.h)}` : undefined,
      path: cssPath(pick.el),
      text: pick.text ?? visibleText(pick.el),
      component: react(pick.el),
    })),
  }
  reset()
  tell('Pinning…', false, 0)
  try {
    note.png = await withMarks(await picture(), pinned)
  } catch (err) {
    note.noPicture = String(err?.message ?? err)
  }
  const response = await POST('note', note).catch(() => null)
  if (!response || response.status === 404) return copy(note)
  const answer = await response.json().catch(() => ({}))
  if (!response.ok) return tell('Not pinned: ' + answer.error, true)
  if (!note.png) return tell('Pinned, without a picture: ' + note.noPicture, true)
  tell(answer.claude ? '📍 Pinned. It goes with your next message to Claude.' : '📍 Pinned in .notes/notes.md.')
}

const visibleText = (el) => (el?.innerText || el?.getAttribute?.('aria-label') || el?.alt || '').trim().slice(0, 200)

// The page draws its own picture: no permission, no extension. Taken inside a frame, right after the page has drawn,
// when a WebGL canvas still holds its picture (no preserveDrawingBuffer needed). The note's UI is left out.
async function picture() {
  const { createContext, domToCanvas } = await import('./modern-screenshot.js')
  const context = await createContext(document.documentElement, {
    scale: devicePixelRatio,
    // The window's width, not the page's: a page a little wider than the window (something poking out on the right)
    // would otherwise be laid out again for a wider screen, with other margins and line breaks.
    width: document.documentElement.clientWidth,
    // All of it, to scroll to where the screen was. At least the screen: a page whose content is all fixed (a game)
    // measures zero high.
    height: Math.max(document.documentElement.scrollHeight, innerHeight),
    filter: (node) => node !== host,
    // Getting ready waits for every image on the page to load, and one left to load lazily further down never starts.
    // Those on screen have loaded already; the rest are not in the picture anyway.
    timeout: 300,
    autoDestruct: true,
  })
  // Fetching what the picture needs (fonts, images) may take longer.
  context.timeout = 3000
  // A tab in the background gets no frames: after a moment it is drawn anyway (a WebGL canvas may come out blank).
  const page = await new Promise((resolve, reject) => {
    let started = false
    const draw = () => {
      if (started) return
      started = true
      domToCanvas(context).then(resolve, reject)
    }
    requestAnimationFrame(draw)
    setTimeout(draw, 500)
  })
  // The whole page is drawn; keep the part that was on screen.
  const scale = devicePixelRatio
  const canvas = document.createElement('canvas')
  canvas.width = innerWidth * scale
  canvas.height = innerHeight * scale
  canvas.getContext('2d').drawImage(page, -scrollX * scale, -scrollY * scale)
  return canvas
}

// Draws the marks on the picture, as they were on the screen, and returns it as base64 PNG.
async function withMarks(canvas, pinned) {
  const ctx = canvas.getContext('2d')
  ctx.scale(devicePixelRatio, devicePixelRatio)
  pinned.forEach((pick, i) => {
    // A ring or a frame, not a filled dot, so what was picked stays readable inside it. Dark, white, then red, so it
    // shows on any background.
    for (const [width, colour] of [[8, '#0009'], [6, '#fff'], [3.5, RED]]) {
      ctx.beginPath()
      if (pick.w) ctx.roundRect(pick.x, pick.y, pick.w, pick.h, 4)
      else ctx.arc(pick.x, pick.y, 14, 0, Math.PI * 2)
      ctx.lineWidth = width
      ctx.strokeStyle = colour
      ctx.stroke()
    }
    // Numbered when there are several, as the note lists them.
    if (pinned.length < 2) return
    const x = pick.w ? pick.x + pick.w : pick.x + 14
    const y = pick.w ? pick.y : pick.y - 14
    ctx.beginPath()
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.fillStyle = RED
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#fff'
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), x, y + 0.5)
  })
  return canvas.toDataURL('image/png').split(',')[1]
}

// Without the plugin (the client put on a page by hand) there is nowhere to save: the words go to the clipboard
// and the picture to the downloads.
async function copy(note) {
  const { png, targets, ...rest } = note
  if (png) {
    const link = Object.assign(document.createElement('a'), { href: 'data:image/png;base64,' + png, download: 'note.png' })
    link.click()
  }
  const lines = (fields) => Object.entries(fields).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`)
  const componentLine = (c) => c && c.names.join(' ← ') + (c.file ? ` (${c.file})` : '')
  const text = [
    ...lines(rest),
    ...targets.flatMap(({ component, ...target }, i) => [
      ...(targets.length > 1 ? [`mark ${i + 1}:`] : []),
      ...lines({ ...target, component: componentLine(component) }),
    ]),
  ].join('\n')
  // The clipboard can refuse (the page lost focus while the picture was drawn): the picture is still downloaded.
  const copied = await navigator.clipboard.writeText(text).then(() => true, () => false)
  if (!copied) return tell('Nowhere to save the note, and the clipboard refused it.')
  const where = png ? ', the picture in your downloads.' : '.'
  tell('No ai-debug-pins plugin on this server: the note is on the clipboard' + where)
}

// ---- Pointing at the code ----

// A short CSS selector for the element: up to five steps, stopping at an id.
function cssPath(el) {
  const steps = []
  for (let node = el; node?.nodeType === Node.ELEMENT_NODE && steps.length < 5; node = node.parentElement) {
    if (node.id) {
      steps.unshift('#' + CSS.escape(node.id))
      break
    }
    let step = node.localName + [...node.classList].slice(0, 2).map((c) => '.' + CSS.escape(c)).join('')
    const siblings = node.parentElement ? [...node.parentElement.children].filter((x) => x.localName === node.localName) : []
    if (siblings.length > 1) step += `:nth-of-type(${siblings.indexOf(node) + 1})`
    steps.unshift(step)
  }
  return steps.join(' > ')
}

// React in development keeps its fiber on the DOM node. The nearest components, and the file the element was
// written in (React 19: the stack of where it was created; React 18 and older: _debugSource).
function react(el) {
  for (let node = el; node; node = node.parentElement) {
    const key = Object.keys(node).find((k) => k.startsWith('__reactFiber$'))
    if (!key) continue
    const names = []
    let file = null
    for (let fiber = node[key]; fiber && names.length < 3; fiber = fiber.return) {
      const at = source(fiber)
      // A bundler's chunk (Next.js serves client code from /_next/) is no file anyone can open: names only.
      if (!file && at && !at.startsWith('_next/')) file = at
      // Only components used in the project's own code: a library's insides (CanvasImpl, minified names) say nothing.
      if (!at) continue
      const type = fiber.type
      if (typeof type === 'function') names.push(type.displayName || type.name || 'Anonymous')
      else if (type?.render) names.push(type.displayName || type.render.name || 'ForwardRef')
    }
    return names.length ? { names, file } : null
  }
  return null
}

// The file a fiber was written in, as the project knows it (src/App.tsx), or null for a library's.
function source(fiber) {
  if (fiber._debugSource) return `${fiber._debugSource.fileName}:${fiber._debugSource.lineNumber}`
  // React 19 keeps the stack of where the element was made: the first frame is React's own jsx(), the second the
  // component that made it. Its address is the dev server's (Vite: /src/App.tsx), or for a server component a file
  // on disk (Next.js: about://React/Prerender/file:///.../app/page.tsx).
  const frame = String(fiber._debugStack?.stack ?? '').split('\n').filter((l) => l.trim().startsWith('at '))[1]
  // "at Name (address:line:col)" or "at address:line:col"; the address itself may hold brackets (Turbopack's do).
  const url = frame?.match(/\((.*):\d+:\d+\)\s*$/)?.[1] ?? frame?.match(/at (\S+):\d+:\d+\s*$/)?.[1]
  // Only real addresses: "<anonymous>" and the like belong to no file.
  if (!/^(https?|file|about):\/\//.test(url ?? '')) return null
  // Turbopack names the source inside the address of its chunk, encoded twice: ...?id=%255Bproject%255D/app/page.tsx+...
  const turbopack = decodeURIComponent(decodeURIComponent(url)).match(/\[project\]\/([^\s+?]+)/)?.[1]
  if (turbopack) return /node_modules/.test(turbopack) ? null : turbopack
  const path = decodeURI(url.split('?')[0].replace(/^about:\/\/React\/[^/]+\//, ''))
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/^file:\/\//, '')
  // Libraries, also inside a bundler's chunk names (Turbopack's node_modules_next_dist_...), and Vite's own.
  return /node_modules|next_dist|react-dom|^@|\/\.next\//.test(path) ? null : path
}
