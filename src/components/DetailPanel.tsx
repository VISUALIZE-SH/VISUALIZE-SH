import type { ReactNode } from 'react'
import type {
  Curation,
  Entity,
  GraphEdgeData,
  GraphNodeData,
} from '../types/entities'
import { GROUP_META } from '../graph/palette'

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

function Fact({ label, value }: { label: string; value?: ReactNode }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="fact">
      <span className="fact-label">{label}</span>
      <span className="fact-value">{value}</span>
    </div>
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
          <Facts e={e} />
        </section>

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
