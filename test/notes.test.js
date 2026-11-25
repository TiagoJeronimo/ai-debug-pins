import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { saveNote, takeNew } from '../notes.js'

test('a note is written with its picture, then taken once', async () => {
  const dir = join(await mkdtemp(join(tmpdir(), 'ai-debug-pins-')), '.notes')
  const time = new Date('2026-11-25T10:00:00.000Z')
  const id = await saveNote(dir, {
    time, note: 'Too big\nand pink', url: 'http://localhost:5173/', viewport: '1280x800', dpr: 2, point: '10, 20',
    path: 'main > h1', text: 'Hello\n world', component: { names: ['Title', 'Home'], file: 'src/Home.tsx' },
  }, Buffer.from('png'))
  await saveNote(dir, { time: new Date(+time + 1000), note: 'No picture', noPicture: 'denied' })

  assert.equal(id, '2026-11-25T10-00-00-000Z')
  assert.deepEqual((await readdir(dir)).sort(), ['.gitignore', '2026-11-25T10-00-00-000Z.png', 'notes.md'])
  assert.equal(await readFile(join(dir, '.gitignore'), 'utf8'), '*\n')
  const md = await readFile(join(dir, 'notes.md'), 'utf8')
  assert.match(md, /^## 2026-11-25T10-00-00-000Z · new\n\n> Too big\n> and pink\n\n!\[picture\]\(2026-11-25T10-00-00-000Z\.png\)/m)
  assert.match(md, /redrawn by the page/)
  assert.match(md, /- text: "Hello world"/)
  assert.match(md, /- component: Title ← Home \(src\/Home\.tsx\)/)
  assert.match(md, /_No picture: denied\._/)

  const fresh = await takeNew(dir)
  assert.equal(fresh.length, 2)
  assert.match(fresh[1], /No picture/)
  assert.deepEqual(await takeNew(dir), [])
  assert.equal((await readFile(join(dir, 'notes.md'), 'utf8')).match(/· read$/gm).length, 2)
})
