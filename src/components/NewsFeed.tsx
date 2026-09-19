import type { KeyboardEvent, MouseEvent } from 'react'
import type { NewsItem } from '../types/entities'
import './NewsFeed.css'

export interface NewsFeedProps {
  items: NewsItem[]
  selectedItemId?: string
  onSelect?: (item: NewsItem) => void
  emptyMessage?: string
  className?: string
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    // `publishedAt` is a date-only value. Formatting in UTC prevents viewers
    // west of Greenwich from seeing the preceding calendar day.
    timeZone: 'UTC',
  }).format(date)
}

function sourceLabel(url: string, source: string): string {
  if (source.trim()) return source
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Source'
  }
}

function stopCardClick(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation()
}

export default function NewsFeed({
  items,
  selectedItemId,
  onSelect,
  emptyMessage = 'No recent news to show.',
  className = '',
}: NewsFeedProps) {
  const classNames = ['news-feed', className].filter(Boolean).join(' ')

  if (items.length === 0) {
    return (
      <section className={classNames} aria-label="News">
        <div className="news-feed-empty">
          <span className="news-feed-empty-mark" aria-hidden="true">✦</span>
          <p>{emptyMessage}</p>
        </div>
      </section>
    )
  }

  function selectItem(item: NewsItem) {
    onSelect?.(item)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>, item: NewsItem) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectItem(item)
    }
  }

  return (
    <section className={classNames} aria-label="News">
      <div className="news-feed-list" role="list">
        {items.map((item) => {
          const selected = item.id === selectedItemId
          return (
            <article
              key={item.id}
              className={`news-card${selected ? ' is-selected' : ''}`}
              role="listitem"
              tabIndex={onSelect ? 0 : undefined}
              aria-current={selected ? 'true' : undefined}
              onClick={() => selectItem(item)}
              onKeyDown={(event) => handleKeyDown(event, item)}
            >
              <div className="news-card-meta">
                <span className="news-card-source">
                  {sourceLabel(item.sourceUrl, item.sourceName)}
                </span>
                <span className="news-card-dot" aria-hidden="true">·</span>
                <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
              </div>
              <h3 className="news-card-title">{item.title}</h3>
              <p className="news-card-summary">{item.summary}</p>
              {item.topicTags.length > 0 && (
                <ul className="news-card-topics" aria-label="Topics">
                  {item.topicTags.map((topic) => <li key={topic}>{topic}</li>)}
                </ul>
              )}
              <a
                className="news-card-link"
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={stopCardClick}
              >
                Read source <span aria-hidden="true">↗</span>
              </a>
            </article>
          )
        })}
      </div>
    </section>
  )
}
