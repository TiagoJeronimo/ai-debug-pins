// UserPromptSubmit: adds notes pinned since the last message to it, and marks them read.
// Off with PINNOTES_HOOK=0.
import { join } from 'node:path'
import { takeNew } from '../notes.js'

if (process.env.PINNOTES_HOOK !== '0') {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  const dir = join(JSON.parse(raw).cwd ?? process.cwd(), '.notes')
  const fresh = await takeNew(dir)
  if (fresh.length)
    console.log(
      `New notes pinned on the page (from ${dir}/notes.md; open each picture in that folder). ` +
        'Use the read-my-notes skill to act on them.\n\n' + fresh.join('\n\n'),
    )
}
