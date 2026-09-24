import type { GraphMeta, GraphNodeData } from '../types/entities'
import type { AppMode } from '../types/intelligence'
import type { ThemePreference } from '../theme'
import SearchBar from './SearchBar'

interface Props {
  meta: GraphMeta
  nodes: GraphNodeData[]
  onSelect: (id: string) => void
  onAbout: () => void
  accessibilityMode: boolean
  onToggleAccessibility: () => void
  themePreference: ThemePreference
  onThemePreferenceChange: (preference: ThemePreference) => void
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  onNewsletter: () => void
}

export default function Header({
  meta,
  nodes,
  onSelect,
  onAbout,
  accessibilityMode,
  onToggleAccessibility,
  themePreference,
  onThemePreferenceChange,
  mode,
  onModeChange,
  onNewsletter,
}: Props) {
  return (
    <header className="header">
      <div className="header-start">
        <div className="header-brand">
          <h1>
            VISUALIZE<span className="brand-accent">·SH</span>
          </h1>
          <p className="header-sub">Structural heart intelligence</p>
        </div>
        <div className="header-search">
          <SearchBar nodes={nodes} onSelect={onSelect} />
        </div>
      </div>

      <nav className="header-primary-nav" aria-label="Primary views">
        <div className="seg view-switcher">
          <button
            className={`seg-btn ${mode === 'news' ? 'active' : ''}`}
            aria-pressed={mode === 'news'}
            onClick={() => onModeChange('news')}
          >
            News
          </button>
          <button
            className={`seg-btn ${mode === 'atlas' ? 'active' : ''}`}
            aria-pressed={mode === 'atlas'}
            onClick={() => onModeChange('atlas')}
          >
            Atlas
          </button>
          <button
            className={`seg-btn ${mode === 'data' ? 'active' : ''}`}
            aria-pressed={mode === 'data'}
            onClick={() => onModeChange('data')}
          >
            Data
          </button>
        </div>
      </nav>

      <div className="header-tools">
        <label className="theme-control">
          <span>Theme</span>
          <select value={themePreference} onChange={(event) => onThemePreferenceChange(event.target.value as ThemePreference)} aria-label="Color theme">
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
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
        <button
          className="newsletter-trigger"
          type="button"
          onClick={onNewsletter}
        >
          Newsletter
        </button>
      </div>
    </header>
  )
}
