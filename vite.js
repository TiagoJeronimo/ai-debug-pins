// The Vite plugin: puts the note button on every page of the dev server and saves what it sends.
// apply: 'serve', so nothing of it reaches a production build.
import { handler, claudePlugin, HINT } from './server.js'

export default function debugPins({ dir = '.notes' } = {}) {
  return {
    name: 'ai-debug-pins',
    apply: 'serve',
    // Every page of a Vite dev server loads Vite's own client, whoever writes the page: frameworks that render their
    // HTML themselves (SvelteKit, Astro, Nuxt...) never pass it through transformIndexHtml, so the button rides along
    // with the client instead.
    transform(code, id) {
      if (/[\\/]vite[\\/]dist[\\/]client[\\/]client\.mjs$/.test(id.split('?')[0])) {
        // A variable, so that Vite leaves the address alone: it is served by the middleware below, not a file.
        return code + "\n;{ const pins = '/@ai-debug-pins/client.js'; import(/* @vite-ignore */ pins).catch(() => {}) }\n"
      }
    },
    configureServer(server) {
      server.middlewares.use(handler({ dir, prefix: '/@ai-debug-pins/', log: (m) => server.config.logger.info(m) }))
      claudePlugin().then((ok) => ok || server.config.logger.info(HINT))
    },
  }
}
