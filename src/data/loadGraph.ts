import type { GraphData } from '../types/entities'

// graph.json lives in public/ and is copied to the site root at build time.
// BASE_URL makes the path correct under a GitHub Pages sub-path as well as in dev.
export async function loadGraph(): Promise<GraphData> {
  const res = await fetch(`${import.meta.env.BASE_URL}graph.json`)
  if (!res.ok) {
    throw new Error(`Failed to load graph data (HTTP ${res.status})`)
  }
  return (await res.json()) as GraphData
}
