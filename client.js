// The note button. Plain DOM, no framework, so it works on any page. Its UI lives in a shadow root and is hidden
// while the picture is taken, so it never appears in it.
const POST = (path, body) =>
  fetch('/@pinnotes/' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

const host = document.createElement('pinnotes-ui')
const ui = host.attachShadow({ mode: 'open' })
ui.innerHTML = `<style>
  :host { all: initial; font: 14px/1.4 system-ui, sans-serif; }
  * { box-sizing: border-box; }
  .fab { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: 40px; height: 40px; border-radius: 50%;
    border: 0; background: #e5484d; color: #fff; font-size: 18px; cursor: pointer; box-shadow: 0 2px 8px #0004; }
  .fab[aria-pressed='true'] { background: #222; }
  .layer { position: fixed; inset: 0; z-index: 2147483646; cursor: crosshair; }
  .dot { position: fixed; width: 28px; height: 28px; margin: -14px; border-radius: 50%; border: 4px solid #e5484d;
    box-shadow: 0 0 0 2px #fff, 0 0 0 3px #0006; z-index: 2147483647; pointer-events: none; }
  .box { position: fixed; z-index: 2147483647; width: 300px; padding: 6px; background: #fff; border-radius: 8px;
    box-shadow: 0 4px 16px #0005; }
  input { width: 100%; padding: 6px 8px; border: 1px solid #ccc; border-radius: 6px; font: inherit; color: #111; }
  .toast { position: fixed; right: 64px; bottom: 22px; z-index: 2147483647; max-width: 420px; padding: 6px 10px;
    border-radius: 6px; background: #222; color: #fff; }
  [hidden] { display: none; }
</style>
<button class="fab" title="Pin a note (click, then click a spot)" aria-pressed="false">✎</button>
<div class="layer" hidden></div><div class="dot" hidden></div>
<form class="box" hidden><input placeholder="Your note. Enter saves, Esc cancels" aria-label="Note"></form>
<div class="toast" role="status" hidden></div>`
document.documentElement.append(host)

const $ = (s) => ui.querySelector(s)
const fab = $('.fab'), layer = $('.layer'), dot = $('.dot'), box = $('.box'), input = $('input'), toast = $('.toast')
let pick = null // the click: point, the element under it, and where the viewport sits on the screen

const reset = () => {
  pick = null
  for (const el of [layer, dot, box]) el.hidden = true
  input.value = ''
  fab.setAttribute('aria-pressed', 'false')
}
const say = (text) => {
  toast.textContent = text
  toast.hidden = false
  clearTimeout(say.t)
  say.t = setTimeout(() => (toast.hidden = true), 6000)
}

fab.onclick = () => (layer.hidden ? ((layer.hidden = false), fab.setAttribute('aria-pressed', 'true')) : reset())
addEventListener('keydown', (e) => e.key === 'Escape' && !layer.hidden && reset(), true)
input.onkeydown = (e) => {
  if (e.key === 'Escape') reset()
  // Not left to the form's own Enter, which some input methods and automation skip; not while composing a character.
  if (e.key === 'Enter' && !e.isComposing) e.preventDefault(), box.requestSubmit()
}

layer.onclick = (e) => {
  host.style.display = 'none'
  const el = document.elementFromPoint(e.clientX, e.clientY)
  host.style.display = ''
  // The viewport's corner on the screen, from the click itself: right whatever the toolbar or a docked DevTools.
  pick = { x: e.clientX, y: e.clientY, el, sx: e.screenX - e.clientX, sy: e.screenY - e.clientY }
  layer.hidden = true
  Object.assign(dot.style, { left: e.clientX + 'px', top: e.clientY + 'px' })
  Object.assign(box.style, {
    left: Math.min(e.clientX + 14, innerWidth - 310) + 'px',
    top: Math.min(e.clientY + 14, innerHeight - 60) + 'px',
  })
  dot.hidden = box.hidden = false
  input.focus()
}

box.onsubmit = async (e) => {
  e.preventDefault()
  const p = pick
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
  // Out of the picture: hide, let the browser show two frames without us, then take it.
  host.style.display = 'none'
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))))
  let res
  try {
    res = await POST('shot', { x: p.sx, y: p.sy, w: innerWidth, h: innerHeight })
  } finally {
    host.style.display = ''
  }
  if (res.status === 404) return copy(note)
  if (res.ok) note.png = await withDot(await res.blob(), p.x, p.y)
  else note.noPicture = (await res.json()).error
  const saved = await POST('note', note)
  if (!saved.ok) return say('Not saved: ' + (await saved.json().catch(() => ({}))).error)
  say(note.png ? 'Saved in .notes/notes.md' : 'Saved without a picture. ' + note.noPicture)
}

async function withDot(blob, x, y) {
  const img = await createImageBitmap(blob)
  const k = img.width / innerWidth // the picture is in device pixels
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const g = c.getContext('2d')
  g.drawImage(img, 0, 0)
  // A ring, not a filled dot, so what was clicked stays readable inside it.
  for (const [width, colour] of [[8, '#0009'], [6, '#fff'], [3.5, '#e5484d']]) {
    g.beginPath()
    g.arc(x * k, y * k, 14 * k, 0, Math.PI * 2)
    g.lineWidth = width * k
    g.strokeStyle = colour
    g.stroke()
  }
  return c.toDataURL('image/png').split(',')[1]
}

// Without the plugin (the client put on a page by hand) there is nowhere to save: the note goes to the clipboard.
async function copy(note) {
  const { png: _, component: c, ...rest } = note
  const text = Object.entries({ ...rest, component: c && c.names.join(' ← ') + (c.file ? ` (${c.file})` : '') })
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  await navigator.clipboard.writeText(text)
  say('No pinnotes plugin on this server: the note is on the clipboard, without a picture.')
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
      file ??= at
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
  for (const m of String(f._debugStack?.stack ?? '').matchAll(/(https?:\/\/[^\s()]+?):\d+:\d+/g)) {
    const path = new URL(m[1]).pathname
    if (!path.includes('/node_modules/') && !path.startsWith('/@')) return path.slice(1)
  }
  return null
}
