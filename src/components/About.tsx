import type { GraphMeta } from '../types/entities'
import { GROUP_META, GROUP_ORDER } from '../graph/palette'

interface Props {
  meta: GraphMeta
  onClose: () => void
}

export default function About({ meta, onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <h2>About VISUALIZE·SH</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p>
            An interactive knowledge graph of the <strong>structural heart</strong>{' '}
            landscape — valvular and non-valvular — covering conditions and
            anatomy, therapies (devices, pharmaceuticals, digital, procedures),
            companies, and clinical trials.
          </p>

          <h3>Reading the graph</h3>
          <p>
            Node <strong>color/shape</strong> encodes entity type;{' '}
            <strong>size</strong> encodes connections. Label{' '}
            <strong>size</strong> reflects <strong>pulse</strong>{' '}
            — a 0–10 recent-news-attention score — so the most newsworthy
            topics stay legible when zoomed out.
            A dashed outline marks unreviewed <em>drafts</em>.{' '}
            <strong>Drag</strong> any node and its neighbors follow, via a
            lightweight physics pull that fades across the network.
          </p>

          <h3>What&apos;s inside</h3>
          <ul className="about-counts">
            {GROUP_ORDER.map((g) => (
              <li key={g}>
                <span
                  className="dot"
                  style={{ background: GROUP_META[g].color }}
                />
                {GROUP_META[g].label}
                <span className="count">{meta.counts[g] ?? 0}</span>
              </li>
            ))}
          </ul>

          <h3>Built &amp; updated</h3>
          <p>
            Every entity is authored as YAML, validated against a JSON
            Schema, and compiled into the graph at build time. A scheduled
            assistant can draft updates (new approvals, trial readouts) for a
            human curator to review and promote.
          </p>

          <h3>Data &amp; disclaimer</h3>
          <p className="disclaimer">
            For educational use only — this is <strong>not medical advice</strong>{' '}
            and may be incomplete or out of date. Regulatory status, trial
            results, and ownership change frequently; verify against primary
            sources (FDA labeling, ClinicalTrials.gov, peer-reviewed literature)
            before relying on this.
          </p>

          <p className="muted">
            Data last updated {meta.lastUpdated} · {meta.total} entities ·{' '}
            {meta.draftCount} drafts pending curation.
          </p>
        </div>
      </div>
    </div>
  )
}
