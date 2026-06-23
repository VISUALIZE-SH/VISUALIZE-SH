import type { GraphMeta, GraphNodeData } from '../types/entities'
import { LAYOUT_LABELS, type LayoutName } from '../graph/layouts'
import SearchBar from './SearchBar'

interface Props {
  meta: GraphMeta
  nodes: GraphNodeData[]
  layoutName: LayoutName
  onLayoutChange: (l: LayoutName) => void
  onSelect: (id: string) => void
  onFit: () => void
  onRelayout: () => void
  onAbout: () => void
  onToggleFilters: () => void
  filtersCollapsed: boolean
  accessibilityMode: boolean
  onToggleAccessibility: () => void
}

const LAYOUTS: LayoutName[] = ['fcose', 'dagre', 'concentric', 'timeline']

export default function Header({
  meta,
  nodes,
  layoutName,
  onLayoutChange,
  onSelect,
  onFit,
  onRelayout,
  onAbout,
  onToggleFilters,
  filtersCollapsed,
  accessibilityMode,
  onToggleAccessibility,
}: Props) {
  return (
    <header className="header">
      <div className="header-brand">
        <button
          className="icon-btn filters-toggle"
          onClick={onToggleFilters}
          aria-label={filtersCollapsed ? 'Show options panel' : 'Hide options panel'}
          title={filtersCollapsed ? 'Show options panel' : 'Hide options panel'}
        >
          ☰
        </button>
        <div>
          <h1>
            VISUALIZE<span className="brand-accent">·SH</span>
          </h1>
          <p className="header-sub">Structural heart atlas</p>
        </div>
      </div>

      <div className="header-search">
        <SearchBar nodes={nodes} onSelect={onSelect} />
      </div>

      <div className="header-tools">
        <div className="seg" role="group" aria-label="Layout">
          {LAYOUTS.map((l) => (
            <button
              key={l}
              className={`seg-btn ${layoutName === l ? 'active' : ''}`}
              onClick={() => onLayoutChange(l)}
              title={`${LAYOUT_LABELS[l]} layout`}
            >
              {LAYOUT_LABELS[l]}
            </button>
          ))}
        </div>
        <button className="icon-btn" onClick={onFit} title="Fit to screen">
          ⤢
        </button>
        <button className="icon-btn" onClick={onRelayout} title="Re-run layout">
          ↻
        </button>
        <label
          className={`mode-toggle ${accessibilityMode ? 'active' : ''}`}
          title="Accessibility mode"
        >
          <input
            type="checkbox"
            checked={accessibilityMode}
            onChange={onToggleAccessibility}
          />
          <span>Accessibility</span>
        </label>
        <button className="text-btn" onClick={onAbout} title="About & data sources">
          About
        </button>
        <span className="updated" title="Most recent data update">
          {meta.total} nodes · updated {meta.lastUpdated}
        </span>
      </div>
    </header>
  )
}
