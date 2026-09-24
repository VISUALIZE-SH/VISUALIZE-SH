import { useEffect, useMemo, useState } from 'react'
import type { GraphNodeData, NewsItem } from '../../types/entities'
import type { IntelligenceData, ProductFamily, ProductVersion } from '../../types/intelligence'
import { formatEvidenceDate, isOnOrBefore } from '../../data/intelligence'
import { normalizeAtlasTopic } from '../../data/atlas-topic'
import './intelligence.css'

export interface NewsWorkspaceProps {
  data: IntelligenceData
  legacyNews: NewsItem[]
  nodesById: Map<string, GraphNodeData>
  versionId: string | null
  onOpenAtlas: (id: string) => void
  onOpenAtlasTopic: (topic: string) => void
  onOpenData: (id: string) => void
  atlasTopics: ReadonlySet<string>
  newsFrom: string
  newsTo: string
}

interface FamilyTrail {
  family: ProductFamily
  versions: ProductVersion[]
}

interface RelatedStory {
  item: NewsItem
  sharedNodes: string[]
  sharedTopics: string[]
  score: number
}

function familyTrails(data: IntelligenceData, item: NewsItem): FamilyTrail[] {
  const directVersionIds = new Set(item.relevantNodeIds)
  return data.families.flatMap((family) => {
    const versions = data.versions.filter((version) => version.familyId === family.id)
    const connected = family.entityIds.some((id) => directVersionIds.has(id)) || versions.some((version) => directVersionIds.has(version.id))
    return connected ? [{ family, versions }] : []
  })
}

function relatedStories(item: NewsItem, stories: NewsItem[], nodesById: Map<string, GraphNodeData>): RelatedStory[] {
  const nodeIds = new Set(item.relevantNodeIds)
  const topics = new Set(item.topicTags.map((tag) => tag.toLowerCase()))
  return stories.flatMap((candidate) => {
    if (candidate.id === item.id) return []
    const sharedNodes = candidate.relevantNodeIds.filter((id) => nodeIds.has(id))
    const sharedTopics = candidate.topicTags.filter((tag) => topics.has(tag.toLowerCase()))
    const deviceLinks = sharedNodes.filter((id) => {
      const group = nodesById.get(id)?.group
      return group === 'device' || group === 'digital' || group === 'pharmaceutical' || group === 'procedure'
    }).length
    const score = sharedNodes.length * 4 + deviceLinks * 3 + sharedTopics.length
    return score ? [{ item: candidate, sharedNodes, sharedTopics, score }] : []
  }).sort((a, b) => b.score - a.score || b.item.publishedAt.localeCompare(a.item.publishedAt)).slice(0, 2)
}

function ConnectionPanel({
  data, item, stories, nodesById, onOpenAtlas, onOpenAtlasTopic, atlasTopics, onRevealStory,
}: {
  data: IntelligenceData
  item: NewsItem
  stories: NewsItem[]
  nodesById: Map<string, GraphNodeData>
  onOpenAtlas: (id: string) => void
  onOpenAtlasTopic: (topic: string) => void
  atlasTopics: ReadonlySet<string>
  onRevealStory: (id: string) => void
}) {
  const trails = familyTrails(data, item).slice(0, 2)
  const related = relatedStories(item, stories, nodesById)
  const entityLabels = item.relevantNodeIds
    .map((id) => nodesById.get(id)?.label)
    .filter((label): label is string => Boolean(label))
    .slice(0, 4)
  const count = trails.length + related.length + (item.topicTags.length ? 1 : 0)

  if (!count) return null
  return <section className="intel-news-connections" aria-label={`Connections for ${item.title}`}>
    <div className="intel-connection-hub"><span>Related coverage</span></div>
    <div className="intel-connection-branches">
      {trails.map(({ family, versions }) => <section className="intel-connection-branch" key={family.id}>
        <p className="intel-connection-label">Device history</p>
        <h4>{family.name}</h4>
        <div className="intel-version-trail" aria-label={`${family.name} generations`}>
          {versions.map((version, index) => <span key={version.id}>
            {index > 0 && <i aria-hidden="true">→</i>}
            <button type="button" onClick={() => onOpenAtlas(version.id)}>{version.name}</button>
          </span>)}
          {!versions.length && <span>Version history is not yet curated.</span>}
        </div>
      </section>)}
      {related.length > 0 && <section className="intel-connection-branch">
        <div className="intel-related-stories">
          {related.map(({ item: relatedItem, sharedNodes, sharedTopics }) => {
            const reason = sharedNodes.map((id) => nodesById.get(id)?.label).filter(Boolean)[0] ?? sharedTopics[0]
            return <button type="button" key={relatedItem.id} onClick={() => onRevealStory(relatedItem.id)}>
              <time>{formatEvidenceDate(relatedItem.publishedAt)}</time>
              <span>{relatedItem.title}</span>
              {reason && <small>Shared connection: {reason}</small>}
            </button>
          })}
        </div>
      </section>}
      <section className="intel-connection-branch">
        <p className="intel-connection-label">Topic trail</p>
        <div className="intel-topic-trail">{item.topicTags.map((tag) => atlasTopics.has(normalizeAtlasTopic(tag))
          ? <button type="button" key={tag} onClick={() => onOpenAtlasTopic(tag)} title={`Filter the Atlas by ${tag}`}>{tag}</button>
          : <span key={tag}>{tag}</span>)}</div>
        {entityLabels.length > 0 && <p className="intel-entity-context">Also linked to {entityLabels.join(' · ')}</p>}
      </section>
    </div>
  </section>
}

export default function NewsWorkspace({
  data, legacyNews, nodesById, versionId, onOpenAtlas, onOpenAtlasTopic, onOpenData, atlasTopics, newsFrom, newsTo,
}: NewsWorkspaceProps) {
  const [visibleCount, setVisibleCount] = useState(12)
  const stories = useMemo(() => legacyNews.filter((item) => {
    if (newsFrom && item.publishedAt < newsFrom) return false
    if (newsTo && !isOnOrBefore(item.publishedAt, newsTo)) return false
    if (!versionId) return true
    return familyTrails(data, item).some(({ versions }) => versions.some((version) => version.id === versionId))
      || item.relevantNodeIds.includes(versionId)
  }).slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title)), [legacyNews, data, versionId, newsFrom, newsTo])

  useEffect(() => setVisibleCount(12), [versionId, newsFrom, newsTo])

  function revealStory(id: string) {
    setVisibleCount(stories.length)
    window.setTimeout(() => document.getElementById(`story-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }

  return <section className="intel-workspace intel-news" aria-labelledby="news-title">
    <header className="intel-workspace-head">
      <div>
        <h2 id="news-title">News</h2>
        {/* <p>A reverse-chronological, source-first feed. Connections under each item link related coverage, product generations, and recurring topics.</p> */}
      </div>
    </header>

    {stories.length ? <>
      <div className="intel-news-timeline">
        {stories.slice(0, visibleCount).map((item) => {
          const trails = familyTrails(data, item)
          const exactVersion = data.versions.find((version) => item.relevantNodeIds.includes(version.id))
          const trailVersions = trails.flatMap((trail) => trail.versions)
          const primaryVersion = exactVersion ?? trailVersions[trailVersions.length - 1]
          return <article className="intel-news-story" id={`story-${item.id}`} key={item.id}>
            <time className="intel-news-date" dateTime={item.publishedAt}>{formatEvidenceDate(item.publishedAt)}</time>
            <div className="intel-news-story-body">
              <div className="intel-news-story-meta"><span>{item.topicTags[0] ?? 'Structural heart'}</span><span>{item.sourceName}</span></div>
              <h3>{item.title}</h3>
              <p className="intel-news-brief">{item.summary}</p>
              <div className="intel-news-source-row">
                <span className="intel-news-sources">
                  <a className="intel-source" href={item.sourceUrl} target="_blank" rel="noreferrer">Read at {item.sourceName} ↗</a>
                  {item.additionalSources?.map((source) => <a className="intel-source intel-source-secondary" href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.label} ↗</a>)}
                </span>
                {primaryVersion && <span className="intel-card-actions">
                  <button type="button" onClick={() => onOpenAtlas(primaryVersion.id)}>Open product profile</button>
                  <button type="button" onClick={() => onOpenData(primaryVersion.id)}>Inspect evidence</button>
                </span>}
              </div>
              <ConnectionPanel data={data} item={item} stories={stories} nodesById={nodesById} onOpenAtlas={onOpenAtlas} onOpenAtlasTopic={onOpenAtlasTopic} atlasTopics={atlasTopics} onRevealStory={revealStory} />
            </div>
          </article>
        })}
      </div>
      {visibleCount < stories.length && <div className="intel-load-more">
        <p>Showing {visibleCount} of {stories.length} items</p>
        <button type="button" className="intel-button" onClick={() => setVisibleCount((count) => Math.min(count + 12, stories.length))}>Show 12 more</button>
      </div>}
    </> : <div className="intel-empty"><h3>No matching news</h3><p>Try another product or date range.</p></div>}
  </section>
}
