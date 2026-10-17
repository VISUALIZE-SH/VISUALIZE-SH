import type { NewsItem } from '../types/entities'

export const LAAO_EDITORIAL_ID = 'news-2026-10-16-laao-design-series-part-1'
// Seven Los Angeles calendar days, including the editorial's publication date.
export const EDITORIAL_START = Date.parse('2026-10-16T00:00:00-07:00')
export const EDITORIAL_END = Date.parse('2026-10-23T00:00:00-07:00')
export const EDITORIAL_DISMISS_KEY = `editorial-dismissed:${LAAO_EDITORIAL_ID}`

export function editorialInvitation(news: NewsItem[], now = Date.now()): NewsItem | undefined {
  if (now < EDITORIAL_START || now >= EDITORIAL_END) return undefined
  return news.find(item => item.id === LAAO_EDITORIAL_ID && item.contentType === 'editorial')
}
