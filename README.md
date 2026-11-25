# pinnotes

Click a spot on your dev page, type a line, press Enter. You get a real screenshot with a ring where you clicked,
plus your words and where they point in the code, in `.notes/notes.md`. Then tell Claude Code: "read my notes".

It works on WebGL games as well as on plain pages, because the picture is the screen itself, not a redrawing of the DOM.

## Use

```js
// vite.config.js
import pinnotes from 'pinnotes'

export default { plugins: [pinnotes()] }
```

Run the dev server, click ✎ at the bottom right, click a spot, type, Enter (Esc cancels). The plugin only runs on
`vite serve`: nothing reaches a build.

Each note in `.notes/notes.md` has the picture, the page, the viewport and pixel ratio, the point, a short CSS path, the
element's text and, on React pages, the nearest components and the file. `.notes/` ignores itself in git.

## Pictures: macOS, one permission

Pictures are taken with macOS's `screencapture`, of the browser's visible page area. The app that runs the dev
server (your terminal, or your editor) needs **Screen Recording** permission once: System Settings › Privacy & Security.
Without it, or on Windows and Linux for now, the note is saved without a picture and says why.

Being a real screenshot, it also catches whatever floats over the browser at that moment (a video call, a notification).
Page zoom other than 100% puts the picture off.

## Claude Code

This repo is also a Claude Code plugin: a skill, `read-my-notes`, and a hook that adds notes pinned since your last
message to the next one (marking them read). The skill marks notes done once it has handled them.

```bash
claude plugin marketplace add /path/to/pinnotes
```

```bash
claude plugin install pinnotes@pinnotes
```

Or for one session: `claude --plugin-dir /path/to/pinnotes`. To turn the hook off, set `PINNOTES_HOOK=0`.

## Here

```bash
npm run demo   # a page with a WebGL canvas
npm test
```
