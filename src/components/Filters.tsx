import type { GraphMeta, NodeGroup, RegulatoryStatus } from '../types/entities'
import { GROUP_META, GROUP_ORDER } from '../graph/palette'
import Legend from './Legend'

interface Props {
  meta: GraphMeta
  activeGroups: Set<NodeGroup>
  onToggleGroup: (g: NodeGroup) => void
  activeRegulatory: Set<RegulatoryStatus>
  onToggleRegulatory: (r: RegulatoryStatus) => void
  showDrafts: boolean
  onToggleDrafts: () => void
  onReset: () => void
}

const REGULATORY: { id: RegulatoryStatus; label: string }[] = [
  { id: 'approved', label: 'Approved' },
  { id: 'investigational', label: 'Investigational' },
  { id: 'discontinued', label: 'Discontinued' },
]

export default function Filters({
  meta,
  activeGroups,
  onToggleGroup,
  activeRegulatory,
  onToggleRegulatory,
  showDrafts,
  onToggleDrafts,
  onReset,
}: Props) {
  return (
    <div className="filters">
      <div className="filters-head">
        <h2>Filters</h2>
        <button className="link-btn" onClick={onReset}>
          Reset
        </button>
      </div>

      <section className="filter-group">
        <h3>Entity type</h3>
        {GROUP_ORDER.map((g) => (
          <label key={g} className="check">
            <input
              type="checkbox"
              checked={activeGroups.has(g)}
              onChange={() => onToggleGroup(g)}
            />
            <span className="dot" style={{ background: GROUP_META[g].color }} />
            <span className="check-label">{GROUP_META[g].label}</span>
            <span className="count">{meta.counts[g] ?? 0}</span>
          </label>
        ))}
      </section>

      <section className="filter-group">
        <h3>Therapy regulatory status</h3>
        {REGULATORY.map((r) => (
          <label key={r.id} className="check">
            <input
              type="checkbox"
              checked={activeRegulatory.has(r.id)}
              onChange={() => onToggleRegulatory(r.id)}
            />
            <span className="check-label">{r.label}</span>
          </label>
        ))}
        <p className="filter-note">Applies to device, pharma &amp; digital nodes.</p>
      </section>

      <section className="filter-group">
        <h3>Curation</h3>
        <label className="check">
          <input type="checkbox" checked={showDrafts} onChange={onToggleDrafts} />
          <span className="check-label">
            Show drafts <span className="count">{meta.draftCount}</span>
          </span>
        </label>
        <p className="filter-note">
          Drafts are auto-suggested, not yet human-curated (dashed outline).
        </p>
      </section>

      <Legend />
    </div>
  )
}
