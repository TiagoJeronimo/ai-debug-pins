#!/usr/bin/env node
// For pages not built by Vite (Next.js, Angular, Rails, plain HTML...): a small server for the button and the notes.
// npx ai-debug-pins [port]   then, in development only:
// <script type="module" src="http://localhost:7777/client.js"></script>
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { handler, claudePlugin, HINT } from './server.js'

const port = Number(process.argv[2] || process.env.PORT || 7777)
const server = createServer(handler())
server.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE'
    ? `ai-debug-pins: port ${port} is taken (another copy of this server?). Another port: npx ai-debug-pins ${port + 1}, and the same port in the script tag.`
    : `ai-debug-pins: ${e.message}`)
  process.exit(1)
})
server.listen(port, '127.0.0.1', () => {
  console.log(`ai-debug-pins: notes go to ${resolve('.notes')}`)
  console.log(`Add to your page, in development only:`)
  console.log(`  <script type="module" src="http://localhost:${port}/client.js"></script>`)
  claudePlugin().then((ok) => ok || console.log(HINT))
})
