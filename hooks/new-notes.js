// UserPromptSubmit: adds notes pinned since the last message to it, and marks them read.
// Off with AI_DEBUG_PINS_HOOK=0.
import { join } from 'node:path'
import { takeNew } from '../notes.js'

if (process.env.AI_DEBUG_PINS_HOOK !== '0') {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  const dir = join(JSON.parse(raw).cwd ?? process.cwd(), '.notes')
  const fresh = await takeNew(dir)
  if (fresh.length) {
    const quotes = fresh.map((n) => (n.match(/^> (.*)$/m)?.[1] ?? '').slice(0, 60)).filter(Boolean)
    console.log(JSON.stringify({
      // Shown to the user in the chat, so they can see the note went out with their message.
      systemMessage: `📍 ${fresh.length} note${fresh.length > 1 ? 's' : ''} sent with this message: ${quotes.map((q) => `"${q}"`).join(', ')}`,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext:
          `The user pinned ${fresh.length} new note${fresh.length > 1 ? 's' : ''} on their page (from ${dir}/notes.md; ` +
          'open each picture in that folder). Begin your reply with one line saying you got them, e.g. ' +
          `"Got ${fresh.length} note${fresh.length > 1 ? 's' : ''}: …" with each note's words. Then, with the read-my-notes ` +
          "skill, review each note and do what it asks (fix or change the code), and mark it done; a note that only " +
          'asks a question gets an answer.\n\n' + fresh.join('\n\n'),
      },
    }))
  }
}
