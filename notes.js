// Writing and reading .notes/notes.md. Shared by the Vite plugin (writes) and the Claude Code hook (reads).
import { mkdir, writeFile, appendFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const line = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

/** Saves one note (and its picture, if there is one). Returns the note's id. */
export async function saveNote(dir, note, png) {
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, '.gitignore'), '*\n')
  const id = (note.time instanceof Date ? note.time : new Date()).toISOString().replace(/[:.]/g, '-')
  if (png) await writeFile(join(dir, id + '.png'), png)
  const quote = String(note.note ?? '').trim().split('\n').map((l) => '> ' + l).join('\n')
  const c = note.component
  const fields = [
    png
      ? `![picture](${id}.png)\n_The picture is redrawn by the page from its DOM: small differences from the screen are not bugs._`
      : `_No picture: ${line(note.noPicture) || 'none taken'}._`,
    '',
    `- page: ${line(note.url)}`,
    `- viewport: ${line(note.viewport)} @${line(note.dpr)}x`,
    `- point: ${line(note.point)} (the ring, in CSS pixels)`,
    `- element: \`${line(note.path)}\``,
    note.text && `- text: "${line(note.text)}"`,
    c?.names?.length && `- component: ${c.names.map(line).join(' ← ')}${c.file ? ` (${line(c.file)})` : ''}`,
  ].filter((f) => f !== undefined && f !== false && f !== '')
  await appendFile(join(dir, 'notes.md'), `\n## ${id} · new\n\n${quote}\n\n${fields.join('\n')}\n`)
  return id
}

/** Returns the notes still marked new and marks them read. */
export async function takeNew(dir) {
  const file = join(dir, 'notes.md')
  const md = await readFile(file, 'utf8').catch(() => '')
  const fresh = md.split(/(?=^## )/m).filter((s) => /^## .* · new$/m.test(s.split('\n')[0]))
  if (fresh.length) await writeFile(file, md.replace(/^(## .*) · new$/gm, '$1 · read'))
  return fresh.map((s) => s.trim())
}

/** Deletes the notes marked done, and their pictures. Returns how many went. */
export async function clearDone(dir) {
  const file = join(dir, 'notes.md')
  const md = await readFile(file, 'utf8').catch(() => '')
  const done = (s) => /^## .* · done$/m.test(s.split('\n')[0])
  const parts = md.split(/(?=^## )/m)
  const gone = parts.filter(done)
  if (!gone.length) return 0
  await writeFile(file, parts.filter((s) => !done(s)).join(''))
  for (const s of gone) await rm(join(dir, s.match(/^## (\S+)/)[1] + '.png'), { force: true })
  return gone.length
}
