// Writing and reading .notes/notes.md. Shared by the Vite plugin (writes) and the Claude Code hook (reads).
import { mkdir, writeFile, appendFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const line = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

/** Saves one note (and its picture, if there is one). Returns the note's id. */
export async function saveNote(dir, note, png) {
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, '.gitignore'), '*\n')
  const id = (note.time ?? new Date()).toISOString().replace(/[:.]/g, '-')
  if (png) await writeFile(join(dir, id + '.png'), png)
  const quote = String(note.note ?? '').trim().split('\n').map((l) => '> ' + l).join('\n')
  const c = note.component
  const fields = [
    png ? `![picture](${id}.png)` : `_No picture: ${line(note.noPicture) || 'none taken'}._`,
    '',
    `- page: ${line(note.url)}`,
    `- viewport: ${line(note.viewport)} @${line(note.dpr)}x`,
    `- point: ${line(note.point)} (the dot, in CSS pixels)`,
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
