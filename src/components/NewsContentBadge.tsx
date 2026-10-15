import type { NewsContentType } from '../types/entities'
import './NewsContentBadge.css'

export function newsContentTypeLabel(contentType?: NewsContentType): string {
  switch (contentType) {
    case 'news-insights': return 'News Insights'
    case 'editorial': return 'Editorial'
    default: return 'News'
  }
}

export default function NewsContentBadge({ contentType }: { contentType?: NewsContentType }) {
  if (!contentType || contentType === 'news') return null
  return <span className="news-content-badge">{newsContentTypeLabel(contentType)}</span>
}
