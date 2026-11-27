---
name: clear-my-notes
description: Delete the pinned notes already marked done (in .notes/notes.md) and their pictures. Use when the user says "clear my notes", "clean up the notes" or similar.
---

# Clear my notes

From the project root, run:

```bash
node "${CLAUDE_SKILL_DIR}/clear.js"
```

It deletes every note marked `· done` and its picture; notes still `new` or `read` stay. Tell the user what it printed.
