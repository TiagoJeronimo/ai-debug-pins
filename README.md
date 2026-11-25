# pinnotes

Click a spot on your dev page, type a line, press Enter. You get a picture of the page with a ring where you clicked,
plus your words and where they point in the code, in `.notes/notes.md`. Then tell Claude Code: "read my notes".

No permission and no extension: the page draws its own picture ([modern-screenshot](https://github.com/qq15725/modern-screenshot)).
WebGL canvases come out too, because the picture is taken right after the page has drawn a frame.

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

## The picture

It is redrawn from the page, not a screenshot, so it can differ in small ways (a stray character from an unusual CSS
`content`, a lighter shadow). Each note says so, and the skill tells Claude to act on your words and the element they
point at, never on how the picture looks. Without the plugin (the client put on a page by hand) the note goes to the
clipboard and the picture to your downloads.

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
