---
name: read-my-notes
description: Read the notes the user pinned on their dev pages (.notes/notes.md, each with a screenshot and a red dot) and act on them. Use when the user says "read my notes", "my notes", "check the notes" or similar.
---

# Read my notes

1. Read `.notes/notes.md` in the project root. Each note is a `## <id> · <status>` section; status is `new`, `read`
   or `done`. Work on every note that is not `done`, oldest first. No file or none open: say so and stop.
2. For each note, open its picture (`.notes/<id>.png`) with Read; the red ring is where the user clicked. The `> quote`
   is what they want. `element`, `text` and `component` point to the code: search for the component name, the file,
   the visible text or the class names.
   The picture is redrawn by the page itself, not a screenshot: it can differ from the screen in small ways (a stray
   character, a lighter shadow). Use it only to see where the note points. Never change anything because of how the
   picture looks, only because of what the note says.
3. Do what the note asks, and only that. If it is unclear, or a question, answer or ask instead of changing code.
4. After a note is handled, change its heading to `· done` (edit only that word). Leave notes you skipped as they are.
5. End with one line per note: what you did, or why not.
