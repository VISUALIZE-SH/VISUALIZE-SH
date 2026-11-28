import type { NewsItem } from '../types/entities'

/**
 * News shows the newest published items. Once the published feed holds more
 * than this many, the older ones move to the News Archive page. Nothing is
 * deleted: data/news.yaml and public/graph.json keep every published item.
 */
export const NEWS_PAGE_LIMIT = 300

/** Newest first; same-day items in a stable id order. */
export function orderNews(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id))
}

/** Split an ordered published feed into the News page and the News Archive. */
export function splitNewsArchive(ordered: NewsItem[], limit = NEWS_PAGE_LIMIT): { current: NewsItem[]; archive: NewsItem[] } {
  return { current: ordered.slice(0, limit), archive: ordered.slice(limit) }
}
