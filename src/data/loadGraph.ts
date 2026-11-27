import type { GraphData, NewsItem } from '../types/entities'
import type { NewsArchiveData } from './news-archive'

// graph.json lives in public/ and is copied to the site root at build time.
// BASE_URL makes the path correct under a GitHub Pages sub-path as well as in dev.
export async function loadGraph(): Promise<GraphData> {
  // Revalidate public data so a reload sees newly reviewed News after deployment.
  const requestOptions = { method: 'GET', cache: 'no-cache' as const }
  const res = await fetch(`${import.meta.env.BASE_URL}graph.json`, requestOptions)
  if (!res.ok) {
    throw new Error(`Failed to load graph data (HTTP ${res.status})`)
  }
  return (await res.json()) as GraphData
}

// Older News is a separate payload, fetched only when the News Archive opens.
export async function loadNewsArchive(): Promise<NewsItem[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}news-archive.json`, { method: 'GET', cache: 'no-cache' })
  if (!res.ok) {
    throw new Error(`Failed to load the News Archive (HTTP ${res.status})`)
  }
  return ((await res.json()) as NewsArchiveData).news
}
