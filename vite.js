// The Vite plugin: puts the note button on every page of the dev server and saves what it sends.
// apply: 'serve', so nothing of it reaches a production build.
import { handler, claudePlugin, HINT } from './server.js'

export default function debugPins({ dir = '.notes' } = {}) {
  return {
    name: 'ai-debug-pins',
    apply: 'serve',
    transformIndexHtml: () => [
      { tag: 'script', attrs: { type: 'module', src: '/@ai-debug-pins/client.js' }, injectTo: 'body' },
    ],
    configureServer(server) {
      server.middlewares.use(handler({ dir, prefix: '/@ai-debug-pins/', log: (m) => server.config.logger.info(m) }))
      claudePlugin().then((ok) => ok || server.config.logger.info(HINT))
    },
  }
}
