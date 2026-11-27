import { test } from 'node:test'
import assert from 'node:assert/strict'
import debugPins from '../vite.js'

test('the button rides along with Vite’s own client, and with nothing else', () => {
  const { transform, apply } = debugPins()
  assert.equal(apply, 'serve')
  const client = transform('export {}', '/app/node_modules/vite/dist/client/client.mjs?v=1')
  assert.match(client, /\/@ai-debug-pins\/client\.js/)
  assert.match(client, /@vite-ignore/)
  assert.equal(transform('export {}', 'C:\\app\\node_modules\\vite\\dist\\client\\client.mjs'), 'export {}\n;{ const pins = \'/@ai-debug-pins/client.js\'; import(/* @vite-ignore */ pins).catch(() => {}) }\n')
  assert.equal(transform('export {}', '/app/src/main.ts'), undefined)
})
