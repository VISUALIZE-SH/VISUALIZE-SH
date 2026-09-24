import type { EvidenceMedia, IntelligenceData, Provenance } from '../../types/intelligence'

const panelLabels: Record<EvidenceMedia['panel'], string> = {
  design: 'Design',
  fit: 'Fit',
  function: 'Function',
  action: 'Action',
  workflow: 'Workflow',
}

/** Preserve Vite's deployment base while keeping authored paths host-agnostic. */
function publicAssetPath(path: string): string {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  return `${base}${path.replace(/^\/+/, '')}`
}

function SourceLinks({ data, item }: { data: IntelligenceData; item: Provenance }) {
  return <span className="intel-media-sources">{item.sourceRefs.map((ref) => {
    const source = data.sources.find((entry) => entry.id === ref.sourceId)
    const label = `${source?.publisher ?? ref.sourceId} · ${ref.locator}`
    return source?.url
      ? <a key={`${ref.sourceId}:${ref.locator}`} href={source.url} target="_blank" rel="noreferrer">{label} ↗</a>
      : <span key={`${ref.sourceId}:${ref.locator}`}>{label}</span>
  })}</span>
}

export default function EvidenceMediaGallery({
  data, media, heading = 'Cited document figures', compact = false, flat = false,
}: {
  data: IntelligenceData
  media: EvidenceMedia[]
  heading?: string
  compact?: boolean
  flat?: boolean
}) {
  if (!media.length) return null
  const panels = [...new Set(media.map((item) => item.panel))]
  if (flat) return <section className="intel-media-gallery intel-media-gallery-flat" aria-label={heading}>
    <h3>{heading}</h3><div className="intel-media-grid">{media.map((item) => <figure className="intel-media-card" key={item.id}>
      <img src={publicAssetPath(item.assetPath)} alt={item.alt} loading="lazy" /><figcaption>
        <div className="intel-media-caption-head"><strong>{item.title}</strong>{item.reviewStatus === 'draft' && <span className="intel-badge intel-badge-draft">Draft</span>}</div>
        <p>{item.versionIds.map((id) => data.versions.find((version) => version.id === id)?.name ?? id).join(', ')} · {panelLabels[item.panel]}</p><p>{item.caption}</p>
        <p className="intel-media-locator">{item.page ? `Page ${item.page}` : 'Page not recorded'}{item.figure ? ` · ${item.figure}` : ''}</p><SourceLinks data={data} item={item} />
      </figcaption></figure>)}</div></section>
  return <section className={`intel-media-gallery${compact ? ' intel-media-gallery-compact' : ''}`} aria-label={heading}>
    <header className="intel-media-gallery-head"><h3>{heading}</h3><span>{media.length} {media.length === 1 ? 'figure' : 'figures'}</span></header>
    {panels.map((panel) => <section className="intel-media-panel" key={panel} aria-labelledby={`media-panel-${panel}`}>
      <h4 id={`media-panel-${panel}`}>{panelLabels[panel]}</h4>
      <div className="intel-media-grid">{media.filter((item) => item.panel === panel).map((item) => <figure className="intel-media-card" key={item.id}>
        <img src={publicAssetPath(item.assetPath)} alt={item.alt} loading="lazy" />
        <figcaption>
          <div className="intel-media-caption-head"><strong>{item.title}</strong>{item.reviewStatus === 'draft' && <span className="intel-badge intel-badge-draft">Draft</span>}</div>
          <p>{item.caption}</p>
          <p className="intel-media-locator">{item.page ? `Page ${item.page}` : 'Page not recorded'}{item.figure ? ` · ${item.figure}` : ''}</p>
          <SourceLinks data={data} item={item} />
        </figcaption>
      </figure>)}</div>
    </section>)}</section>
}
