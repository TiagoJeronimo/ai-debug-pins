import type { Plugin } from 'vite'

/** Puts the note button on every page of the dev server. `dir` is where notes go (default `.notes`). */
export default function pinnotes(options?: { dir?: string }): Plugin
