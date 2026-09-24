import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev the app is served from '/'. The production build is deployed to the
// visualize-sh.com custom domain root (see .github/workflows/deploy.yml, which
// sets VITE_BASE=/); fall back to the GitHub Pages project sub-path only if
// VITE_BASE is unset, e.g. for a one-off build against the default
// <owner>.github.io/<repo>/ URL.
export default defineConfig(({ command, isPreview }) => ({
  // Preview must use the same base as its build; otherwise asset requests fall
  // through to index.html and the app renders a blank page.
  base: command === 'build' || isPreview ? (process.env.VITE_BASE ?? '/visualize-sh/') : '/',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    // The cytoscape core (+fcose) is ~570 kB minified and can't be trimmed without
    // dropping the library; it's a single cached chunk, so raise the warning floor
    // above it to keep build logs clean rather than flagging an unavoidable size.
    chunkSizeWarningLimit: 700,
    // Keep the heavy, rarely-changing graph and force libraries in cached
    // chunks; the workspace views are lazy-loaded by App.tsx.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react') || id.includes('scheduler')) return 'react'
          if (
            id.includes('cytoscape') ||
            id.includes('cose-base') ||
            id.includes('layout-base')
          )
            return 'cytoscape'
          if (id.includes('d3-') || id.includes('simplex-noise')) return 'force'
        },
      },
    },
  },
}))
