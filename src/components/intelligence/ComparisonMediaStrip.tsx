import type { EvidenceMedia, IntelligenceData } from '../../types/intelligence'

function publicAssetPath(path: string): string {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  return `${base}${path.replace(/^\/+/, '')}`
}

/** Exact-version media in the selected column order, with one flat figure grid. */
export default function ComparisonMediaStrip({ data, versionIds }: { data: IntelligenceData; versionIds: string[] }) {
  const media = data.media ?? []
  const items = versionIds.flatMap(versionId => media.filter(item => item.versionIds.includes(versionId)).map(item => ({ versionId, item })))
  if (!items.length) return null

  return <section id="compare-source-figures" className="intel-compare-media" aria-label="Source figures by selected version">
    <h3>Source figures</h3>
    <div className="intel-compare-media-items">{items.map(({ versionId, item }) => <ComparisonMediaItem key={`${versionId}:${item.id}`} data={data} item={item} versionId={versionId} />)}</div>
  </section>
}

function ComparisonMediaItem({ data, item, versionId }: { data: IntelligenceData; item: EvidenceMedia; versionId: string }) {
  return <figure className="intel-compare-media-item">
    <img src={publicAssetPath(item.assetPath)} alt={item.alt} loading="lazy" />
    <figcaption>
      <p className="intel-compare-media-version">{data.versions.find(version => version.id === versionId)?.name ?? versionId}</p>
      <div className="intel-compare-media-title"><strong>{item.title}</strong><span>{item.reviewStatus === 'draft' ? 'Draft' : 'Reviewed'}</span></div>
      <p>{item.caption}</p>
      <p className="intel-compare-media-locator">{item.page ? `Page ${item.page}` : 'Page not recorded'}{item.figure ? ` · ${item.figure}` : ''}</p>
      <ul aria-label={`Sources for ${item.title}`}>{item.sourceRefs.map((ref, index) => {
        const source = data.sources.find(entry => entry.id === ref.sourceId)
        const label = `${source?.publisher ?? ref.sourceId} · ${ref.locator}`
        return <li key={`${ref.sourceId}:${ref.locator}:${index}`}>{source?.url
          ? <a href={source.url} target="_blank" rel="noreferrer">{label} ↗</a>
          : <span>{label}</span>}</li>
      })}</ul>
    </figcaption>
  </figure>
}
