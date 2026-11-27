// UserPromptSubmit: adds notes pinned since the last message to it, and marks them read.
// Stop: notes pinned while Claude was busy wait for the next message, which may be about something else; at the end
// of each turn the chat says they are waiting, so they are not forgotten. It only says so: they still go with the
// next message, in whichever chat is written in next.
// Off with AI_DEBUG_PINS_HOOK=0.
import { join } from 'node:path'
import { newNotes } from '../notes.js'

if (process.env.AI_DEBUG_PINS_HOOK !== '0') {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  let input = {}
  try {
    input = JSON.parse(raw)
  } catch {}
  const dir = join(input.cwd ?? process.cwd(), '.notes')
  const stop = input.hook_event_name === 'Stop'
  const fresh = await newNotes(dir, !stop)
  if (fresh.length) {
    const notes = fresh.length === 1 ? '1 note' : `${fresh.length} notes`
    const quotes = fresh.map((n) => (n.match(/^> (.*)$/m)?.[1] ?? '').slice(0, 60)).filter(Boolean)
    const said = quotes.map((q) => `"${q}"`).join(', ')
    if (stop) console.log(JSON.stringify({ systemMessage: `📍 ${notes} waiting: ${said}. ${fresh.length === 1 ? 'It goes' : 'They go'} with your next message.` }))
    else
      console.log(JSON.stringify({
        // Shown to the user in the chat, so they can see the note went out with their message.
        systemMessage: `📍 ${notes} sent with this message: ${said}`,
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext:
            `The user pinned ${notes.replace(' note', ' new note')} on their page (from ${dir}/notes.md; ` +
            'open each picture in that folder). Begin your reply with one line saying you got them, e.g. ' +
            `"Got ${notes}: …" with each note's words. Then, with the read-my-notes ` +
            "skill, review each note and do what it asks (fix or change the code), and mark it done; a note that only " +
            'asks a question gets an answer.\n\n' + fresh.join('\n\n'),
        },
      }))
  }
}
