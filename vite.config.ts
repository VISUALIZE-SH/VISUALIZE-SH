import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev the app is served from '/'. For the production build it is served from a
// GitHub Pages project sub-path (the repo name); override with VITE_BASE for a
// custom domain (VITE_BASE=/) or a different repo name.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.VITE_BASE ?? '/VISUALIZE-HF/') : '/',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
}))
