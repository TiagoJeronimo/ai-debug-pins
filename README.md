# pinnotes

Click a spot on your dev page, type a line, press Enter. Claude gets a picture of the page with a ring where you
clicked, your words, and where they point in the code. No more screenshot, paste, explain.

Made for [Claude Code](https://claude.com/claude-code): new notes go along with your next message by themselves. The notes are plain files, so other AI tools can read them too
(see the end). Works with [Vite](https://vite.dev) dev servers, and on WebGL games as well as plain pages.

## Set it up with Claude

Paste this into Claude Code, in your project:

> Set up pinnotes here: run `claude plugin marketplace add OWNER/pinnotes` and `claude plugin install pinnotes@pinnotes`,
> then `npm i -D pinnotes`, and add `pinnotes()` (`import pinnotes from 'pinnotes'`) to the plugins in my Vite config.

Then restart the dev server and Claude Code.

## Use

On any page of the dev server: click ✎ at the bottom right, click a spot, type, Enter (Esc cancels). Back in Claude
Code, send anything ("go"): the chat shows "📍 1 note sent with this message", and Claude says what it got, looks at
the picture, finds the code and does what the note asks. Or say "read my notes" for every note not yet done.

Notes live in `.notes/notes.md` with their pictures beside them; `.notes/` ignores itself in git. Each note has the
page, viewport, point, a short CSS path, the element's text and, on React pages, the nearest components and the file.

## Set it up by hand

```bash
npm i -D pinnotes
```

```js
// vite.config.js
import pinnotes from 'pinnotes'

export default { plugins: [pinnotes()] }
```

Only on `vite serve`: nothing reaches a build. For Claude Code:

```bash
claude plugin marketplace add OWNER/pinnotes
```

```bash
claude plugin install pinnotes@pinnotes
```

To stop notes going along with your messages, set `PINNOTES_HOOK=0`; "read my notes" still works.

## The picture

No permission and no extension: the page draws its own picture
([modern-screenshot](https://github.com/qq15725/modern-screenshot)), right after it has drawn a frame, so WebGL comes out
too. Being redrawn, not a screenshot, it can differ in small ways (a stray character from an unusual CSS `content`, a
lighter shadow). Each note says so, and Claude is told to act on your words and the element they point at, never on how
the picture looks.

Not on Vite? Without the plugin there is nowhere to save: the note goes to the clipboard and the picture to your
downloads.

## Other AI tools

The notes are Markdown and PNGs, so any agent that reads files and images can use them (Codex, Cursor, Copilot,
Gemini CLI, ...). Add this to your `AGENTS.md`, then say "read my notes":

```md
## Notes pinned on the page

When I say "read my notes", read `.notes/notes.md`. Each `## <id> · <status>` section is a note (`new`, `read` or
`done`); handle every one that is not `done`, oldest first. Open its picture (`.notes/<id>.png`): the red ring is
where I clicked. The `>` quote is what I want; `element`, `text` and `component` point to the code. The picture is
redrawn by the page and can differ slightly from the screen: act on my words, never on how the picture looks. When a
note is handled, change its heading to `· done`.
```

What only Claude Code gets: notes going along with your messages by themselves, and the "📍 note sent" line.

## Working on it

```bash
npm run demo   # a page with a WebGL canvas
npm test
```

MIT licence.
