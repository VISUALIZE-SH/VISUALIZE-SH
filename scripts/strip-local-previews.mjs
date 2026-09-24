import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Vite copies public/ into dist/. Local editorial previews must not be deployed.
const previewPath = fileURLToPath(new URL('../dist/previews/', import.meta.url))
rmSync(previewPath, { recursive: true, force: true })
