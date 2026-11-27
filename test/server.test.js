import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handler } from '../server.js'

test('the standalone server takes notes from local pages only', async (t) => {
  const dir = join(await mkdtemp(join(tmpdir(), 'ai-debug-pins-')), '.notes')
  const server = createServer(handler({ dir, log: () => {} })).listen(0, '127.0.0.1')
  t.after(() => server.close())
  await new Promise((r) => server.once('listening', r))
  const url = `http://127.0.0.1:${server.address().port}/`
  const post = (origin) =>
    fetch(url + 'note', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{"note":"hi"}' })

  const ok = await post('http://localhost:3000')
  assert.equal(ok.status, 200)
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:3000')
  assert.equal(typeof (await ok.json()).claude, 'boolean')
  assert.match(await readFile(join(dir, 'notes.md'), 'utf8'), /> hi/)
  assert.equal((await post('https://evil.example')).status, 403)
  // A site that rebinds its DNS to 127.0.0.1 still sends its own name as the origin.
  assert.equal((await post('http://localhost.evil.example')).status, 403)
  assert.equal((await fetch(url + 'note', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"note":"x"}' })).status, 403)
  const fake = await fetch(url + 'note', {
    method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: '{"note":"x","png":"aGVsbG8="}',
  })
  assert.equal(fake.status, 400)
  const pre = await fetch(url + 'note', { method: 'OPTIONS', headers: { origin: 'http://app.localhost:8080' } })
  assert.equal(pre.status, 204)
  assert.equal((await fetch(url + 'client.js')).status, 200)
  assert.equal((await fetch(url + 'modern-screenshot.js')).status, 200)
})
