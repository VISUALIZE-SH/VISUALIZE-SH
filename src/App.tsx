import { useEffect, useMemo, useRef, useState } from 'react'
import type Cytoscape from 'cytoscape'
import type { GraphData, NodeGroup, RegulatoryStatus } from './types/entities'
import { loadGraph } from './data/loadGraph'
import { GROUP_ORDER } from './graph/palette'
import { getLayout, frameLayout, type LayoutName } from './graph/layouts'
import { ensureLayoutExtension } from './graph/cytoscapeSetup'
import { timelineYear } from './graph/timeline'
import GraphCanvas from './components/GraphCanvas'
import Header from './components/Header'
import Filters from './components/Filters'
import DetailPanel from './components/DetailPanel'
import About from './components/About'

const ALL_REGULATORY: RegulatoryStatus[] = [
  'approved',
  'investigational',
  'discontinued',
]

export default function App() {
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeGroups, setActiveGroups] = useState<Set<NodeGroup>>(
    new Set(GROUP_ORDER),
  )
  const [activeRegulatory, setActiveRegulatory] = useState<Set<RegulatoryStatus>>(
    new Set(ALL_REGULATORY),
  )
  const [showDrafts, setShowDrafts] = useState(true)
  const [layoutName, setLayoutName] = useState<LayoutName>('fcose')
  const [aboutOpen, setAboutOpen] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const [accessibilityMode, setAccessibilityMode] = useState(false)
  const [timelineTipOpen, setTimelineTipOpen] = useState(false)
  const cyRef = useRef<Cytoscape.Core | null>(null)

  useEffect(() => {
    loadGraph()
      .then(setGraph)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
  }, [])

  const nodes = useMemo(
    () => graph?.elements.nodes.map((n) => n.data) ?? [],
    [graph],
  )
  const edges = useMemo(
    () => graph?.elements.edges.map((e) => e.data) ?? [],
    [graph],
  )
  const nodesById = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  )

  const visibleIds = useMemo(() => {
    const set = new Set<string>()
    if (!graph) return set
    for (const { data } of graph.elements.nodes) {
      if (!activeGroups.has(data.group)) continue
      if (data.isDraft && !showDrafts) continue
      if (
        data.entity.type === 'therapy' &&
        !activeRegulatory.has(data.entity.regulatoryStatus)
      )
        continue
      set.add(data.id)
    }
    return set
  }, [graph, activeGroups, activeRegulatory, showDrafts])

  const timelineSummary = useMemo(() => {
    const dated = nodes.filter((n) => visibleIds.has(n.id) && n.timelineDate)
    const conditions = nodes.filter(
      (n) => visibleIds.has(n.id) && n.group === 'condition',
    )
    if (dated.length === 0) return null
    const years = dated.map((n) => timelineYear(n.timelineDate!))
    return {
      count: dated.length,
      conditionCount: conditions.length,
      total: dated.length + conditions.length,
      start: Math.min(...years),
      end: Math.max(...years),
    }
  }, [nodes, visibleIds])

  useEffect(() => {
    if (layoutName !== 'timeline' || !selectedId) return
    const selected = nodesById.get(selectedId)
    if (!selected?.timelineDate && selected?.group !== 'condition') {
      setSelectedId(null)
    }
  }, [layoutName, nodesById, selectedId])

  if (error)
    return (
      <div className="state-msg error">
        Couldn’t load the graph data: {error}
      </div>
    )
  if (!graph)
    return <div className="state-msg">Loading the structural-heart graph…</div>

  const selectedNode = selectedId ? nodesById.get(selectedId) ?? null : null

  function handleSelect(id: string | null) {
    setSelectedId(id)
    setLeftOpen(false)
  }
  function toggleOptionsPanel() {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 860px)').matches
    ) {
      setLeftOpen((o) => !o)
    } else {
      setFiltersCollapsed((c) => !c)
    }
  }
  function toggleGroup(g: NodeGroup) {
    setActiveGroups((prev) => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })
  }
  function toggleRegulatory(r: RegulatoryStatus) {
    setActiveRegulatory((prev) => {
      const next = new Set(prev)
      next.has(r) ? next.delete(r) : next.add(r)
      return next
    })
  }
  function resetFilters() {
    setActiveGroups(new Set(GROUP_ORDER))
    setActiveRegulatory(new Set(ALL_REGULATORY))
    setShowDrafts(true)
  }
  function fit() {
    const cy = cyRef.current
    if (!cy) return
    // Layout-aware framing: fit-to-all for 2-D layouts, width-fit for the tall
    // layered Hierarchy (see frameLayout).
    frameLayout(cy, layoutName)
  }
  function relayout() {
    const cy = cyRef.current
    if (!cy) return
    ensureLayoutExtension(layoutName).then(() => cy.layout(getLayout(layoutName)).run())
  }

  return (
    <div className={`app ${accessibilityMode ? 'accessibility-mode' : ''}`}>
      <Header
        meta={graph.meta}
        nodes={nodes}
        layoutName={layoutName}
        onLayoutChange={setLayoutName}
        onSelect={(id) => handleSelect(id)}
        onFit={fit}
        onRelayout={relayout}
        onAbout={() => setAboutOpen(true)}
        onToggleFilters={toggleOptionsPanel}
        filtersCollapsed={filtersCollapsed}
        accessibilityMode={accessibilityMode}
        onToggleAccessibility={() => setAccessibilityMode((enabled) => !enabled)}
      />
      <div className="body">
        <aside
          className={`sidebar ${leftOpen ? 'open' : ''} ${
            filtersCollapsed ? 'collapsed' : ''
          }`}
          aria-hidden={filtersCollapsed && !leftOpen}
        >
          <Filters
            meta={graph.meta}
            activeGroups={activeGroups}
            onToggleGroup={toggleGroup}
            activeRegulatory={activeRegulatory}
            onToggleRegulatory={toggleRegulatory}
            showDrafts={showDrafts}
            onToggleDrafts={() => setShowDrafts((d) => !d)}
            onReset={resetFilters}
          />
        </aside>
        {leftOpen && <div className="scrim" onClick={() => setLeftOpen(false)} />}

        <main className="canvas-wrap">
          <GraphCanvas
            graph={graph}
            visibleIds={visibleIds}
            selectedId={selectedId}
            layoutName={layoutName}
            accessibilityMode={accessibilityMode}
            onSelect={handleSelect}
            onCyReady={(cy) => {
              cyRef.current = cy
            }}
          />
          <div className="canvas-disclaimer" role="note">
            This is not a clinical advice tool. Content here is not provided or
            endorsed by the organizations listed.
          </div>
          {layoutName === 'timeline' && (
            <div
              className={`timeline-note ${timelineTipOpen ? 'expanded' : 'collapsed'}`}
              role="note"
            >
              <button
                className="timeline-note-toggle"
                type="button"
                aria-expanded={timelineTipOpen}
                onClick={() => setTimelineTipOpen((open) => !open)}
                title={timelineTipOpen ? 'Collapse timeline tip' : 'Expand timeline tip'}
              >
                <strong>Timeline</strong>
                <span>
                  {timelineSummary
                    ? `${timelineSummary.total} nodes · ${timelineSummary.start}-${timelineSummary.end}`
                    : 'No dated items'}
                </span>
                <span className="timeline-note-icon">
                  {timelineTipOpen ? '−' : '+'}
                </span>
              </button>
              {timelineTipOpen && (
                <p className="timeline-note-detail">
                  {timelineSummary
                    ? `${timelineSummary.count} dated therapies/trials + ${timelineSummary.conditionCount} anatomy/disease nodes. Anatomy/disease state is shown as the top row; companies and other undated context nodes are omitted.`
                    : 'No dated therapies or trials match the current filters.'}
                </p>
              )}
            </div>
          )}
        </main>

        {selectedNode && (
          <DetailPanel
            node={selectedNode}
            nodesById={nodesById}
            edges={edges}
            onSelect={(id) => handleSelect(id)}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {aboutOpen && (
        <About meta={graph.meta} onClose={() => setAboutOpen(false)} />
      )}
    </div>
  )
}
