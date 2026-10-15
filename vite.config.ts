import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Only verified claims ship: a draft (or template) claim file becomes `null` before Vite's JSON
// plugin sees it, so its text, unconfirmed numbers and VERIFY/HUMAN notes never reach the bundle.
// src/lib/content.ts skips null modules.
const dropDraftClaims: Plugin = {
  name: 'drop-draft-claims',
  enforce: 'pre',
  transform(code, id) {
    if (!/\/content\/claims\/[^/]+\.json$/.test(id.split('?')[0])) return
    let status: unknown
    try {
      status = (JSON.parse(code) as { status?: unknown }).status
    } catch {
      return // not valid JSON: leave it for the JSON plugin to report
    }
    if (status !== 'verified') return { code: 'null', map: null }
  },
}

// Static build. Content JSON is bundled at build time via import.meta.glob in src/lib/content.ts.
export default defineConfig({
  plugins: [dropDraftClaims, react()],
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: false,
  },
  server: { port: 5173, strictPort: true, host: '127.0.0.1' },
})
