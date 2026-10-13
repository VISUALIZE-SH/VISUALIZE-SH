import type { NewsItem } from '../src/types/entities'

/** Preserve immutable IDs for documented date corrections without allowing silent mismatches. */
export function newsDateIssues(item: Pick<NewsItem, 'id' | 'publishedAt' | 'reviewStatus' | 'publicationDateCorrection'>): string[] {
  const idDate = item.id.match(/^news-(\d{4}-\d{2}-\d{2})-/)?.[1]
  const correction = item.publicationDateCorrection
  if (!idDate || !item.publishedAt) return [] // Shape/calendar checks belong to the JSON Schema.
  if (!correction) return idDate === item.publishedAt ? [] : ['date prefix must match publishedAt unless a source-supported publicationDateCorrection is recorded']
  const issues: string[] = []
  if (correction.previousPublishedAt !== idDate) issues.push('publicationDateCorrection.previousPublishedAt must match the immutable ID date')
  if (correction.previousPublishedAt === item.publishedAt) issues.push('publicationDateCorrection must change the previous publication date')
  return issues
}
