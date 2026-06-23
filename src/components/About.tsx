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
          <h2>About VISUALIZE·HF</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p>
            An interactive knowledge graph of the <strong>structural heart</strong>{' '}
            landscape — valvular and non-valvular — covering conditions and
            anatomy, the therapies that target them (devices, pharmaceuticals,
            digital, and procedures), the companies behind them, and the clinical
            trials that evaluate them.
          </p>

          <h3>Reading the graph</h3>
          <p>
            Node <strong>color/shape</strong> encodes entity type and{' '}
            <strong>size</strong> encodes how connected it is. Label{' '}
            <strong>size</strong> reflects each item&apos;s <strong>pulse</strong>{' '}
            — a 0–10 score of recent news attention — so the most newsworthy
            topics stay legible when zoomed out; zoom in to reveal the rest.
            A dashed outline marks unreviewed <em>drafts</em>.{' '}
            <strong>Drag</strong> any node and a lightweight physics simulation
            elastically pulls its neighbors along, with the pull falling off across
            the network.
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

          <h3>How it&apos;s built &amp; updated</h3>
          <p>
            Every entity is authored as documented YAML, validated against a JSON
            Schema, and compiled into the graph at build time. The schema is
            structured so a scheduled assistant can draft updates (new approvals,
            trial readouts) as <em>drafts</em> — shown with a dashed outline —
            which are then reviewed and promoted by a human curator.
          </p>

          <h3>Data &amp; disclaimer</h3>
          <p className="disclaimer">
            For educational and informational use only. This is <strong>not
            medical advice</strong> and may be incomplete or out of date.
            Regulatory status, trial results, and corporate ownership change
            frequently — always verify against primary sources (FDA labeling,
            ClinicalTrials.gov, peer-reviewed publications) before relying on
            anything here.
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
