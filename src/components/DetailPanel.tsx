import type { ReactNode } from 'react'
import type {
  Curation,
  Entity,
  GraphEdgeData,
  GraphNodeData,
} from '../types/entities'
import { GROUP_META } from '../graph/palette'
import { formatTimelineDate, TIMELINE_BASIS_LABELS } from '../graph/timeline'

interface Props {
  node: GraphNodeData
  nodesById: Map<string, GraphNodeData>
  edges: GraphEdgeData[]
  onSelect: (id: string) => void
  onClose: () => void
}

interface RelatedGroup {
  label: string
  items: GraphNodeData[]
}

const REL_ORDER = [
  'Treats',
  'Treated by',
  'Evaluated in',
  'Evaluates',
  'Condition studied',
  'Studied in',
  'Made by',
  'Makes',
]

function relatedGroups(
  id: string,
  edges: GraphEdgeData[],
  byId: Map<string, GraphNodeData>,
): RelatedGroup[] {
  const groups = new Map<string, GraphNodeData[]>()
  const push = (label: string, otherId: string) => {
    const other = byId.get(otherId)
    if (!other) return
    const arr = groups.get(label) ?? []
    arr.push(other)
    groups.set(label, arr)
  }
  for (const e of edges) {
    if (e.source !== id && e.target !== id) continue
    const isSource = e.source === id
    const other = isSource ? e.target : e.source
    switch (e.relationship) {
      case 'treats':
        push(isSource ? 'Treats' : 'Treated by', other)
        break
      case 'made_by':
        push(isSource ? 'Made by' : 'Makes', other)
        break
      case 'evaluates':
        push(isSource ? 'Evaluates' : 'Evaluated in', other)
        break
      case 'studies':
        push(isSource ? 'Condition studied' : 'Studied in', other)
        break
    }
  }
  return [...groups.entries()]
    .sort((a, b) => REL_ORDER.indexOf(a[0]) - REL_ORDER.indexOf(b[0]))
    .map(([label, items]) => ({ label, items }))
}

function PulseMeter({ value }: { value: number }) {
  if (!value || value <= 0) return null
  const v = Math.max(0, Math.min(10, value))
  return (
    <div
      className="pulse-row"
      title="Pulse: recent news attention, 0–10 (drives label size in the graph)"
    >
      <span className="fact-label">Pulse</span>
      <span className="pulse-meter" aria-hidden="true">
        <span className="pulse-fill" style={{ width: `${v * 10}%` }} />
      </span>
      <span className="pulse-num">{v}/10</span>
    </div>
  )
}

function Fact({ label, value }: { label: string; value?: ReactNode }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="fact">
      <span className="fact-label">{label}</span>
      <span className="fact-value">{value}</span>
    </div>
  )
}

function TimelineFact({ e }: { e: Entity }) {
  if (e.type !== 'therapy' && e.type !== 'trial') return null
  if (!e.timeline) return null
  const sourceLabel = e.timeline.source
    ? new URL(e.timeline.source).hostname.replace('www.', '')
    : null
  return (
    <>
      <Fact
        label="Timeline"
        value={`${formatTimelineDate(e.timeline)} · ${e.timeline.event}`}
      />
      <Fact label="Date basis" value={TIMELINE_BASIS_LABELS[e.timeline.dateBasis]} />
      {e.timeline.notes && <p className="note">{e.timeline.notes}</p>}
      {e.timeline.source && (
        <div className="links">
          <a href={e.timeline.source} target="_blank" rel="noopener noreferrer">
            {sourceLabel}
          </a>
        </div>
      )}
    </>
  )
}

function refHref(ref: string): string | null {
  if (ref.startsWith('PMID:'))
    return `https://pubmed.ncbi.nlm.nih.gov/${ref.slice(5).trim()}/`
  if (/^https?:\/\//.test(ref)) return ref
  return null
}

function LinkList({ refs }: { refs?: string[] }) {
  if (!refs || refs.length === 0) return null
  return (
    <div className="links">
      {refs.map((r, i) => {
        const href = refHref(r)
        return href ? (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer">
            {r.startsWith('PMID:') ? r : new URL(href).hostname.replace('www.', '')}
          </a>
        ) : (
          <span key={i} className="muted">
            {r}
          </span>
        )
      })}
    </div>
  )
}

function statusBadge(value: string, kind: 'reg' | 'result') {
  return <span className={`badge ${kind}-${value}`}>{value}</span>
}

// Build a PubMed search URL — a verifiable, non-fabricated fallback that lands on
// the primary literature (clinical source for devices; outcome publications for
// trials). Curated `links` are always shown first and take precedence.
function pubmedSearch(query: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`
}
// Reduce a display name to a clean PubMed query: drop "(Brand)" parentheticals and
// any "/ alternate name" so e.g. "Edwards SAPIEN 3 / SAPIEN 3 Ultra RESILIA" -> the
// core "Edwards SAPIEN 3".
function coreName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .split('/')[0]
    .replace(/\s+/g, ' ')
    .trim()
}

interface PanelLink {
  label: string
  sub?: string
  url: string
}

/** "More info" links for devices/drugs/procedures (product page or clinical
 *  source) and trials (outcome summary other than ClinicalTrials.gov). */
function MoreInfo({
  node,
  byId,
}: {
  node: GraphNodeData
  byId: Map<string, GraphNodeData>
}) {
  const e = node.entity
  const links: PanelLink[] = []

  if (e.type === 'therapy') {
    for (const l of e.links ?? []) links.push({ label: l.label, url: l.url })
    links.push({
      label: 'Clinical literature',
      sub: 'PubMed',
      url: pubmedSearch(coreName(e.name)),
    })
  } else if (e.type === 'trial') {
    for (const l of e.links ?? []) links.push({ label: l.label, url: l.url })
    const firstTherapy = (e.therapies ?? [])
      .map((id) => byId.get(id)?.label)
      .find(Boolean)
    const query = [coreName(e.name), firstTherapy ? coreName(firstTherapy) : '']
      .filter(Boolean)
      .join(' ')
    links.push({ label: 'Outcome publications', sub: 'PubMed', url: pubmedSearch(query) })
  } else {
    return null
  }

  return (
    <section className="detail-section">
      <h3>More info</h3>
      <div className="link-buttons">
        {links.map((l, i) => (
          <a
            key={i}
            className="link-btn"
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="link-btn-label">{l.label}</span>
            {l.sub && <span className="link-btn-sub">{l.sub}</span>}
            <span className="link-btn-ext" aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </section>
  )
}

function Facts({ e }: { e: Entity }) {
  switch (e.type) {
    case 'condition':
      return (
        <>
          <Fact label="Abbrev." value={e.abbreviation} />
          <Fact label="Category" value={e.category} />
          <Fact label="Anatomy" value={e.anatomy?.join(', ')} />
          {e.description && <p className="desc">{e.description}</p>}
        </>
      )
    case 'therapy':
      return (
        <>
          <Fact label="Type" value={e.therapyType} />
          <Fact label="Class" value={e.subtype} />
          <Fact label="Status" value={statusBadge(e.regulatoryStatus, 'reg')} />
          <TimelineFact e={e} />
          <Fact label="Details" value={e.regulatoryDetail} />
          {e.mechanism && (
            <p className="desc">
              <strong>Mechanism. </strong>
              {e.mechanism}
            </p>
          )}
          {e.description && <p className="desc">{e.description}</p>}
        </>
      )
    case 'company':
      return (
        <>
          <Fact label="Ticker" value={e.ticker} />
          <Fact label="HQ" value={e.hq} />
          <Fact
            label="Website"
            value={
              e.website ? (
                <a href={e.website} target="_blank" rel="noopener noreferrer">
                  {e.website.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              ) : undefined
            }
          />
          {e.description && <p className="desc">{e.description}</p>}
        </>
      )
    case 'trial': {
      const ctgov = e.nctId
        ? `https://clinicaltrials.gov/study/${e.nctId}`
        : null
      return (
        <>
          <Fact label="Phase" value={e.phase} />
          <Fact label="Status" value={e.status} />
          <Fact label="Result" value={statusBadge(e.resultStatus, 'result')} />
          <TimelineFact e={e} />
          <Fact label="Year" value={e.year} />
          <Fact
            label="Enrollment"
            value={e.enrollment ? e.enrollment.toLocaleString() : undefined}
          />
          <Fact label="Primary endpoint" value={e.primaryEndpoint} />
          {e.outcomeSummary && <p className="desc">{e.outcomeSummary}</p>}
          {ctgov && (
            <div className="links">
              <a href={ctgov} target="_blank" rel="noopener noreferrer">
                ClinicalTrials.gov · {e.nctId}
              </a>
            </div>
          )}
          <LinkList refs={e.references} />
        </>
      )
    }
  }
}

function CurationBlock({ c }: { c: Curation }) {
  return (
    <section className="detail-section">
      <h3>Curation</h3>
      <Fact label="Status" value={c.status} />
      <Fact label="Updated" value={c.lastUpdated} />
      {c.notes && <p className="note">{c.notes}</p>}
      <LinkList refs={c.sources} />
    </section>
  )
}

export default function DetailPanel({
  node,
  nodesById,
  edges,
  onSelect,
  onClose,
}: Props) {
  const e = node.entity
  const meta = GROUP_META[node.group]
  const groups = relatedGroups(node.id, edges, nodesById)

  return (
    <aside className="detail">
      <div className="detail-head" style={{ borderTopColor: meta.color }}>
        <div className="detail-title">
          <span className="dot lg" style={{ background: meta.color }} />
          <div>
            <div className="detail-group">
              {meta.label}
              {node.isDraft && <span className="badge draft">draft</span>}
            </div>
            <h2>{e.name}</h2>
          </div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close panel">
          ✕
        </button>
      </div>

      <div className="detail-body">
        <section className="detail-section">
          <PulseMeter value={node.pulse} />
          <Facts e={e} />
        </section>

        <MoreInfo node={node} byId={nodesById} />

        {groups.length > 0 && (
          <section className="detail-section">
            <h3>Connections</h3>
            {groups.map((g) => (
              <div className="rel" key={g.label}>
                <span className="rel-label">{g.label}</span>
                <div className="chips">
                  {g.items.map((it) => (
                    <button
                      key={it.id}
                      className="chip"
                      onClick={() => onSelect(it.id)}
                      title={it.label}
                    >
                      <span
                        className="dot"
                        style={{ background: GROUP_META[it.group].color }}
                      />
                      {it.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <CurationBlock c={e.curation} />
      </div>
    </aside>
  )
}
