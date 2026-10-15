import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Static build. Content JSON is bundled at build time via import.meta.glob in src/lib/content.ts.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: false,
  },
  server: { port: 5173, strictPort: true, host: '127.0.0.1' },
})
