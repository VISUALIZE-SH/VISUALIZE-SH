import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev the app is served from '/'. For the production build it is served from a
// GitHub Pages project sub-path (the repo name); override with VITE_BASE for a
// custom domain (VITE_BASE=/) or a different repo name.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.VITE_BASE ?? '/visualize-sh/') : '/',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    // The cytoscape core (+fcose) is ~570 kB minified and can't be trimmed without
    // dropping the library; it's a single cached chunk, so raise the warning floor
    // above it to keep build logs clean rather than flagging an unavoidable size.
    chunkSizeWarningLimit: 700,
    // Split the heavy, rarely-changing vendor code into its own long-cache chunks
    // so app-code edits don't bust the whole bundle and the browser can fetch them
    // in parallel. dagre is already a separate chunk (dynamically imported).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Leave the Hierarchy layout (cytoscape-dagre + dagre + its graphlib/
          // lodash deps) unassigned so Rollup keeps it in the dynamically-imported
          // chunk — assigning it to a named vendor chunk would force it eager.
          if (
            id.includes('cytoscape-dagre') ||
            id.includes('node_modules/dagre') ||
            id.includes('graphlib') ||
            id.includes('lodash')
          )
            return
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
