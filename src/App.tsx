import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type Cytoscape from 'cytoscape'
import type { GraphData, NewsItem, NodeGroup, RegulatoryStatus } from './types/entities'
import type { AppMode, IntelligenceData } from './types/intelligence'
import { loadGraph } from './data/loadGraph'
import { loadIntelligence } from './data/intelligence'
import { atlasTopicNodeIds, normalizeAtlasTopic } from './data/atlas-topic'
import { parseWorkspace, scopeToCondition, workspaceQuery, type WorkspaceState } from './data/workspace-state'
import { GROUP_ORDER } from './graph/palette'
import { getLayout, frameLayout, LAYOUT_LABELS, type LayoutName } from './graph/layouts'
import { applyResolvedTheme, DARK_MODE_QUERY, readThemePreference, resolveDarkTheme, writeThemePreference, type ThemePreference } from './theme'
import Header from './components/Header'
import Filters from './components/Filters'
import DetailPanel from './components/DetailPanel'
import About from './components/About'
import NewsletterSignup from './components/NewsletterSignup'
import ProfileCatalog from './components/intelligence/ProfileCatalog'
import './workspace.css'

// Mode content and the graph canvas load on demand; App owns only shared state
// and navigation, while each workspace owns its evidence presentation.
const GraphCanvas = lazy(() => import('./components/GraphCanvas'))
const AtlasEvidence = lazy(() => import('./components/intelligence/AtlasEvidence'))
const DataWorkspace = lazy(() => import('./components/intelligence/DataWorkspace'))
const NewsWorkspace = lazy(() => import('./components/intelligence/NewsWorkspace'))
const ALL_REGULATORY: RegulatoryStatus[] = ['approved', 'investigational', 'discontinued']
const NO_HIGHLIGHTS = new Set<string>()
const ATLAS_LAYOUTS: LayoutName[] = ['fcose', 'timeline']

export default function App() {
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [workspace, setWorkspace] = useState(() => parseWorkspace(window.location.search))
  const [compareNotice, setCompareNotice] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(workspace.nodeId || null)
  const [activeGroups, setActiveGroups] = useState<Set<NodeGroup>>(new Set(GROUP_ORDER))
  const [activeRegulatory, setActiveRegulatory] = useState<Set<RegulatoryStatus>>(new Set(ALL_REGULATORY))
  const [showDrafts, setShowDrafts] = useState(true)
  const [materialQuery, setMaterialQuery] = useState('')
  const [layoutName, setLayoutName] = useState<LayoutName>('fcose')
  const [aboutOpen, setAboutOpen] = useState(false)
  const [newsletterOpen, setNewsletterOpen] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const [accessibilityMode, setAccessibilityMode] = useState(false)
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_MODE_QUERY).matches)
  const cyRef = useRef<Cytoscape.Core | null>(null)
  const graphView = workspace.mode === 'atlas' && workspace.atlasView === 'graph'
  const darkMode = resolveDarkTheme(themePreference, systemDark)

  useEffect(() => {
    loadGraph().then(setGraph).catch((err: unknown) => setError(String(err)))
    loadIntelligence().then(setIntelligence).catch((err: unknown) => setEvidenceError(String(err)))
    const onPopState = () => {
      const next = parseWorkspace(window.location.search)
      setWorkspace(next)
      setSelectedId(next.nodeId || null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Follow operating-system changes while in System mode; a manual choice is
  // persisted locally and applies uniformly to DOM and graph-rendered surfaces.
  useEffect(() => {
    const media = window.matchMedia(DARK_MODE_QUERY)
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  useEffect(() => {
    writeThemePreference(themePreference)
    applyResolvedTheme(darkMode)
  }, [themePreference, darkMode])

  function navigate(patch: Partial<WorkspaceState>) {
    // Serialize every shareable choice through one URL boundary so browser
    // history and copied links restore the same workspace state.
    const next = { ...workspace, ...patch }
    setWorkspace(next)
    if (patch.nodeId !== undefined) setSelectedId(patch.nodeId || null)
    const url = new URL(window.location.href)
    url.search = workspaceQuery(next)
    window.history.pushState(null, '', url)
    setLeftOpen(false)
  }

  const nodes = useMemo(() => graph?.elements.nodes.map(n => n.data) ?? [], [graph])
  const edges = useMemo(() => graph?.elements.edges.map(e => e.data) ?? [], [graph])
  const nodesById = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])
  const conditions = nodes.filter(node => node.group === 'condition')
  const scoped = useMemo(() => intelligence ? scopeToCondition(intelligence, workspace.conditionId) : null, [intelligence, workspace.conditionId])
  const eligibleCompareCategory = scoped?.comparisonCategories?.find(category => category.id === workspace.compareCategory)
  const compareVersionIds = eligibleCompareCategory
    ? workspace.compareVersionIds.filter(id => eligibleCompareCategory.versionIds.includes(id)).slice(0, 4)
    : []
  const eligibleConfigurations = scoped?.comparative?.device_configurations.filter(configuration => compareVersionIds.includes(configuration.product_version_id)) ?? []
  const selectedConfigurationByVersion = new Map<string, string>()
  for (const id of workspace.compareConfigurationIds) {
    const configuration = eligibleConfigurations.find(item => item.configuration_id === id)
    if (configuration && !selectedConfigurationByVersion.has(configuration.product_version_id)) selectedConfigurationByVersion.set(configuration.product_version_id, id)
  }
  const compareConfigurationIds = compareVersionIds.flatMap(id => selectedConfigurationByVersion.get(id) ? [selectedConfigurationByVersion.get(id)!] : [])
  // Deep links and shared condition changes can make a comparison stale. Prune
  // it in place and keep the remaining exact versions in their authored order.
  useEffect(() => {
    if (!scoped) return
    const categoryExists = !workspace.compareCategory || Boolean(eligibleCompareCategory)
    const nextCategory = categoryExists ? workspace.compareCategory : ''
    const nextIds = eligibleCompareCategory ? compareVersionIds : []
    const nextConfigurationIds = eligibleCompareCategory ? compareConfigurationIds : []
    if (nextCategory === workspace.compareCategory && nextIds.length === workspace.compareVersionIds.length && nextIds.every((id, index) => id === workspace.compareVersionIds[index]) && nextConfigurationIds.length === workspace.compareConfigurationIds.length && nextConfigurationIds.every((id, index) => id === workspace.compareConfigurationIds[index])) return
    const removedCount = workspace.compareVersionIds.length - nextIds.length
    const removedConfigurations = workspace.compareConfigurationIds.length - nextConfigurationIds.length
    setCompareNotice(!categoryExists && workspace.compareCategory
      ? 'The comparison category is unavailable for this condition, so its selected devices were removed.'
      : !workspace.compareCategory && removedCount > 0
        ? 'Selected devices were removed because the comparison category was missing or invalid.'
      : removedCount > 0
        ? `${removedCount} selected ${removedCount === 1 ? 'device was' : 'devices were'} removed because ${removedCount === 1 ? 'it is' : 'they are'} not eligible for this category.`
        : removedConfigurations > 0
          ? `${removedConfigurations} selected ${removedConfigurations === 1 ? 'configuration was' : 'configurations were'} removed because ${removedConfigurations === 1 ? 'it is' : 'they are'} not eligible for these devices.`
        : '')
    const next = { ...workspace, compareCategory: nextCategory, compareVersionIds: nextIds, compareConfigurationIds: nextConfigurationIds }
    setWorkspace(next)
    const url = new URL(window.location.href)
    url.search = workspaceQuery(next)
    window.history.replaceState(null, '', url)
  }, [scoped, eligibleCompareCategory, compareVersionIds, compareConfigurationIds, workspace])
  const selectedVersion = scoped?.versions.find(version => version.id === workspace.versionId)
  const versionId = selectedVersion?.id ?? null
  const selectedNode = selectedId ? nodesById.get(selectedId) ?? null : null
  const selectedNodeNews = graph?.news.filter(item => selectedId && item.relevantNodeIds.includes(selectedId)) ?? []
  const selectedFamily = intelligence?.families.find(family => selectedId && family.entityIds.includes(selectedId))
  const graphVersions = intelligence?.versions.filter(version => version.familyId === selectedFamily?.id) ?? []
  const materialSuggestions = useMemo(() => [...new Set(nodes.flatMap(node => node.entity.type === 'therapy' ? (node.entity.materials ?? []).map(material => material.name) : []))].sort(), [nodes])
  const normalizedMaterialQuery = materialQuery.trim().toLowerCase()
  const atlasTopicMatchIds = useMemo(() => workspace.atlasTopic ? atlasTopicNodeIds(nodes, workspace.atlasTopic) : NO_HIGHLIGHTS, [nodes, workspace.atlasTopic])
  const atlasTopics = useMemo(() => {
    const topics = new Set((graph?.news ?? []).flatMap((item) => item.topicTags))
    return new Set([...topics].filter((topic) => atlasTopicNodeIds(nodes, topic).size > 0).map(normalizeAtlasTopic))
  }, [graph, nodes])
  const materialMatches = useMemo(() => new Set(nodes.filter(node => node.entity.type === 'therapy' && node.entity.materials?.some(material => [material.name, material.role, material.category, material.note].join(' ').toLowerCase().includes(normalizedMaterialQuery))).map(node => node.id)), [nodes, normalizedMaterialQuery])
  const conditionMatches = useMemo(() => new Set(nodes.filter(node => {
    if (!workspace.conditionId) return true
    const entity = node.entity
    return entity.id === workspace.conditionId || (entity.type === 'therapy' && entity.treats.includes(workspace.conditionId)) || (entity.type === 'trial' && entity.conditions.includes(workspace.conditionId))
  }).map(node => node.id)), [nodes, workspace.conditionId])
  // Graph visibility is a separate projection from the evidence scope above:
  // hiding a node must not silently remove an intelligence record.
  const visibleIds = useMemo(() => new Set(nodes.filter(node => {
    if (!conditionMatches.has(node.id) || !activeGroups.has(node.group) || (node.isDraft && !showDrafts)) return false
    if (normalizedMaterialQuery && !materialMatches.has(node.id)) return false
    if (workspace.atlasTopic && !atlasTopicMatchIds.has(node.id)) return false
    return node.entity.type !== 'therapy' || activeRegulatory.has(node.entity.regulatoryStatus)
  }).map(node => node.id)), [nodes, conditionMatches, activeGroups, showDrafts, normalizedMaterialQuery, materialMatches, workspace.atlasTopic, atlasTopicMatchIds, activeRegulatory])
  const legacyNews = useMemo(() => graph?.news.filter(item => !workspace.conditionId || item.relevantNodeIds.some(id => conditionMatches.has(id))) ?? [], [graph, workspace.conditionId, conditionMatches])

  function openVersion(id: string, mode: AppMode = 'atlas') {
    const version = intelligence?.versions.find(item => item.id === id)
    const family = intelligence?.families.find(item => item.id === version?.familyId)
    navigate({ mode, atlasView: 'profiles', atlasTopic: '', versionId: id, nodeId: '', ...(!family?.conditionIds.includes(workspace.conditionId) ? { conditionId: '' } : {}) })
  }
  function openAtlasTopic(topic: string) {
    setActiveGroups(new Set(GROUP_ORDER))
    setActiveRegulatory(new Set(ALL_REGULATORY))
    setShowDrafts(true)
    setMaterialQuery('')
    setLayoutName('fcose')
    setSelectedId(null)
    navigate({ mode: 'atlas', atlasView: 'graph', atlasTopic: topic, conditionId: '', versionId: '', nodeId: '' })
  }
  function openGraphNode(id: string) {
    setSelectedId(id)
    setLayoutName('fcose')
    navigate({ mode: 'atlas', atlasView: 'graph', atlasTopic: '', versionId: '', nodeId: id })
  }
  function handleModeChange(mode: AppMode) {
    if (mode === 'atlas') {
      setLayoutName('fcose')
      navigate({ mode, atlasView: 'graph', atlasTopic: '', nodeId: '', versionId: '', newsFrom: '', newsTo: '' })
      return
    }
    // News has its own publication window and must never carry evidence or
    // regulatory context forward from Atlas/Data.
    if (mode === 'news') {
      navigate({ mode, atlasTopic: '', jurisdiction: '', asOf: '' })
      return
    }
    navigate({ mode, atlasTopic: '', newsFrom: '', newsTo: '' })
  }
  function handleDataViewChange(dataView: 'browse' | 'compare') {
    setCompareNotice('')
    if (dataView === 'compare' && workspace.versionId && compareVersionIds.length === 0) {
      const category = scoped?.comparisonCategories?.find(item => item.versionIds.includes(workspace.versionId))
      navigate({ dataView, ...(category ? { compareCategory: category.id, compareVersionIds: [workspace.versionId, ...compareVersionIds.filter(id => id !== workspace.versionId)].slice(0, 4) } : {}) })
      return
    }
    navigate({ dataView })
  }
  function handleCompareCategoryChange(compareCategory: string) {
    setCompareNotice('')
    const category = scoped?.comparisonCategories?.find(item => item.id === compareCategory)
    const nextVersionIds = category ? compareVersionIds.filter(id => category.versionIds.includes(id)) : []
    navigate({ compareCategory: category?.id ?? '', compareVersionIds: nextVersionIds, compareConfigurationIds: compareConfigurationIds.filter(id => eligibleConfigurations.some(item => item.configuration_id === id && nextVersionIds.includes(item.product_version_id))) })
  }
  function handleCompareVersionIdsChange(compareVersionIds: string[]) {
    setCompareNotice('')
    const eligible = eligibleCompareCategory?.versionIds ?? []
    const nextVersionIds = [...new Set(compareVersionIds.filter(id => eligible.includes(id)))].slice(0, 4)
    navigate({ compareVersionIds: nextVersionIds, compareConfigurationIds: compareConfigurationIds.filter(id => eligibleConfigurations.some(item => item.configuration_id === id && nextVersionIds.includes(item.product_version_id))) })
  }
  function handleCompareConfigurationIdsChange(ids: string[]) {
    setCompareNotice('')
    const selectedByVersion = new Map<string, string>()
    for (const id of ids) {
      const configuration = eligibleConfigurations.find(item => item.configuration_id === id)
      if (configuration) selectedByVersion.set(configuration.product_version_id, id)
    }
    navigate({ compareConfigurationIds: compareVersionIds.flatMap(id => selectedByVersion.get(id) ? [selectedByVersion.get(id)!] : []) })
  }
  function handleSelect(id: string | null) {
    setSelectedId(id)
    navigate({ nodeId: id ?? '' })
  }
  function handleSearch(id: string) {
    const family = intelligence?.families.find(item => item.entityIds.includes(id))
    const version = intelligence?.versions.find(item => item.familyId === family?.id)
    if (version) openVersion(version.id)
    else {
      setSelectedId(id)
      setLayoutName('fcose')
      navigate({ mode: 'atlas', atlasView: 'graph', atlasTopic: '', nodeId: id, versionId: '', conditionId: '' })
    }
  }
  function handleNewsSelect(item: NewsItem) {
    const family = intelligence?.families.find(entry => entry.entityIds.some(id => item.relevantNodeIds.includes(id)))
    const version = intelligence?.versions.find(entry => entry.familyId === family?.id)
    navigate({ mode: 'news', atlasTopic: '', versionId: version?.id ?? '', conditionId: '' })
  }
  function toggleGroup(group: NodeGroup) { setActiveGroups(previous => { const next = new Set(previous); next.has(group) ? next.delete(group) : next.add(group); return next }) }
  function toggleRegulatory(status: RegulatoryStatus) { setActiveRegulatory(previous => { const next = new Set(previous); next.has(status) ? next.delete(status) : next.add(status); return next }) }
  function resetFilters() {
    setActiveGroups(new Set(GROUP_ORDER)); setActiveRegulatory(new Set(ALL_REGULATORY)); setShowDrafts(true); setMaterialQuery('')
    navigate({ conditionId: '', versionId: '', atlasTopic: '' })
  }
  function toggleOptions() { if (window.matchMedia('(max-width: 860px)').matches) setLeftOpen(value => !value); else setFiltersCollapsed(value => !value) }
  function fit() { if (cyRef.current && !cyRef.current.destroyed()) frameLayout(cyRef.current, layoutName) }
  function relayout() {
    const cy = cyRef.current
    if (!cy || cy.destroyed()) return
    cy.elements(':visible').layout(getLayout(layoutName)).run()
  }

  if (error) return <div className="state-msg error">Couldn’t load the atlas: {error}<button onClick={() => window.location.reload()}>Retry</button></div>
  if (!graph) return <div className="state-msg">Loading VISUALIZE·SH…</div>

  return <div className={`app ${accessibilityMode ? 'accessibility-mode' : ''}`}>
    <Header meta={graph.meta} nodes={nodes} onSelect={handleSearch}
      onAbout={() => setAboutOpen(true)}
      accessibilityMode={accessibilityMode} onToggleAccessibility={() => setAccessibilityMode(value => !value)}
      themePreference={themePreference} onThemePreferenceChange={setThemePreference}
      mode={workspace.mode} onModeChange={handleModeChange}
      onNewsletter={() => setNewsletterOpen(true)} />
    <div className={`workspace-context ${graphView ? 'workspace-context-atlas' : ''}`} aria-label="Shared context">
      <label>Condition<select value={workspace.conditionId} onChange={event => navigate({ conditionId: event.target.value, versionId: '', nodeId: '' })}>
        <option value="">All conditions</option>{conditions.map(node => <option value={node.id} key={node.id}>{node.label}</option>)}
      </select></label>
      {!graphView && <>
        {!(workspace.mode === 'data' && workspace.dataView === 'compare') && <label>Product / configuration<select value={versionId ?? ''} onChange={event => navigate({ versionId: event.target.value })}>
          <option value="">All products</option>{scoped?.versions.map(version => <option key={version.id} value={version.id}>{version.name}</option>)}
        </select></label>}
        {workspace.mode !== 'news' && !(workspace.mode === 'data' && workspace.dataView === 'compare') && <label>Regulatory jurisdiction<select value={workspace.jurisdiction} onChange={event => navigate({ jurisdiction: event.target.value })}>
          <option value="">All jurisdictions</option><option value="US">United States</option>
        </select></label>}
        {workspace.mode !== 'news' && <label>Evidence through<input type="date" value={workspace.asOf} onChange={event => navigate({ asOf: event.target.value })} /></label>}
        {workspace.mode === 'news' && <>
          <label>Published from<input type="date" max={workspace.newsTo || undefined} value={workspace.newsFrom} onChange={event => navigate({ newsFrom: event.target.value })} /></label>
          <label>Published through<input type="date" min={workspace.newsFrom || undefined} value={workspace.newsTo} onChange={event => navigate({ newsTo: event.target.value })} /></label>
        </>}
      </>}
      {graphView && workspace.atlasTopic && <div className="workspace-topic-filter" role="status">
        <span>Atlas topic</span><strong>{workspace.atlasTopic}</strong><small>{atlasTopicMatchIds.size} {atlasTopicMatchIds.size === 1 ? 'match' : 'matches'}</small>
        <button type="button" onClick={() => navigate({ atlasTopic: '', nodeId: '' })} aria-label={`Clear ${workspace.atlasTopic} topic filter`}>×</button>
      </div>}
      {(workspace.conditionId || workspace.versionId || workspace.asOf || workspace.newsFrom || workspace.newsTo || workspace.atlasTopic || workspace.compareCategory || workspace.compareVersionIds.length > 0 || workspace.compareConfigurationIds.length > 0 || (workspace.mode !== 'news' && workspace.jurisdiction !== 'US')) && <button className="text-btn" onClick={() => navigate({ conditionId: '', versionId: '', asOf: '', newsFrom: '', newsTo: '', atlasTopic: '', nodeId: '', compareCategory: '', compareVersionIds: [], compareConfigurationIds: [], jurisdiction: workspace.mode === 'news' ? '' : 'US' })}>Clear context</button>}
      {graphView && <div className="workspace-atlas-controls" aria-label="Atlas graph controls">
        <button className="text-btn filters-toggle" onClick={toggleOptions} aria-label={filtersCollapsed ? 'Show filters' : 'Hide filters'} title={filtersCollapsed ? 'Show filters' : 'Hide filters'}>☰ <span>{filtersCollapsed ? 'Show filters' : 'Hide filters'}</span></button>
        <span className="workspace-atlas-label">Layout</span>
        <div className="seg" role="group" aria-label="Atlas layout">{ATLAS_LAYOUTS.map((layout) => <button key={layout} className={`seg-btn ${layoutName === layout ? 'active' : ''}`} aria-pressed={layoutName === layout} onClick={() => setLayoutName(layout)} title={`${LAYOUT_LABELS[layout]} layout`}>{LAYOUT_LABELS[layout]}</button>)}</div>
        <div className="workspace-atlas-icon-actions">
          <button className="icon-btn" onClick={fit} title="Fit to screen" aria-label="Fit to screen">⤢</button>
          <button className="icon-btn" onClick={relayout} title="Re-run layout" aria-label="Re-run layout">↻</button>
        </div>
      </div>}
      {workspace.mode === 'atlas' && <div className="seg workspace-view-nav" role="group" aria-label="Atlas surface">
        <button className={`seg-btn ${graphView ? 'active' : ''}`} aria-pressed={graphView} onClick={() => navigate({ atlasView: 'graph', versionId: '', nodeId: '' })}>Explore</button>
        <button className={`seg-btn ${!graphView ? 'active' : ''}`} aria-pressed={!graphView} onClick={() => navigate({ atlasView: 'profiles', atlasTopic: '' })}>Profiles</button>
      </div>}
    </div>
    {graphView ? <div className="body">
      <aside className={`sidebar ${leftOpen ? 'open' : ''} ${filtersCollapsed ? 'collapsed' : ''}`} aria-hidden={filtersCollapsed && !leftOpen}>
        <Filters meta={graph.meta} activeGroups={activeGroups} onToggleGroup={toggleGroup} activeRegulatory={activeRegulatory} onToggleRegulatory={toggleRegulatory}
          showDrafts={showDrafts} onToggleDrafts={() => setShowDrafts(value => !value)} materialQuery={materialQuery} onMaterialQueryChange={setMaterialQuery}
          materialMatchCount={materialMatches.size} materialSuggestions={materialSuggestions} onReset={resetFilters} />
      </aside>
      {leftOpen && <div className="scrim" onClick={() => setLeftOpen(false)} />}
      <main className="canvas-wrap">
        <Suspense fallback={<p className="workspace-loading">Loading graph…</p>}>
          <GraphCanvas graph={graph} visibleIds={visibleIds} selectedId={selectedId} highlightedIds={workspace.atlasTopic ? atlasTopicMatchIds : NO_HIGHLIGHTS} layoutName={layoutName} accessibilityMode={accessibilityMode} darkMode={darkMode} onSelect={handleSelect} onCyReady={cy => { cyRef.current = cy }} />
        </Suspense>
        <div className="canvas-disclaimer">Current landscape. Dated evidence and labeling are in Profiles.</div>
      </main>
      {selectedNode && <div className="atlas-detail-stack">
        {graphVersions.length > 0 && <div className="graph-profile-links">Versions{graphVersions.map(version => <button key={version.id} onClick={() => openVersion(version.id)}>{version.name} ↗</button>)}</div>}
        <DetailPanel node={selectedNode} nodesById={nodesById} edges={edges} onSelect={handleSelect} onClose={() => handleSelect(null)} newsItems={selectedNodeNews} onNewsSelect={handleNewsSelect} />
      </div>}
    </div> : <main className="workspace-content" id="workspace-main">
      <Suspense fallback={<p className="workspace-loading" role="status">Loading evidence…</p>}>
        {evidenceError ? <div className="workspace-loading" role="alert"><h2>Evidence is unavailable</h2><p>{evidenceError}</p><button onClick={() => window.location.reload()}>Retry</button><button onClick={() => navigate({ mode: 'atlas', atlasView: 'graph' })}>Open Atlas</button></div> : !scoped ? <p className="workspace-loading" role="status">Loading evidence…</p> : <>
          {workspace.versionId && !selectedVersion && !(workspace.mode === 'data' && workspace.dataView === 'compare') && <p className="workspace-notice" role="status">Product not available in this context. Choose another or clear context.</p>}
          {workspace.mode === 'news' && <NewsWorkspace data={scoped} legacyNews={legacyNews} nodesById={nodesById} versionId={versionId} onOpenAtlas={id => openVersion(id)} onOpenAtlasTopic={openAtlasTopic} onOpenData={id => openVersion(id, 'data')} atlasTopics={atlasTopics} newsFrom={workspace.newsFrom} newsTo={workspace.newsTo} />}
          {workspace.mode === 'data' && <>{workspace.dataView === 'compare' && compareNotice && <p className="workspace-notice" role="status">{compareNotice}</p>}<DataWorkspace data={scoped} conditionId={workspace.conditionId} versionId={versionId} onOpenAtlas={id => openVersion(id)} jurisdiction={workspace.jurisdiction} asOf={workspace.asOf} dataView={workspace.dataView} compareCategory={eligibleCompareCategory?.id ?? ''} compareVersionIds={compareVersionIds} compareConfigurationIds={compareConfigurationIds} onDataViewChange={handleDataViewChange} onCompareCategoryChange={handleCompareCategoryChange} onCompareVersionIdsChange={handleCompareVersionIdsChange} onCompareConfigurationIdsChange={handleCompareConfigurationIdsChange} /></>}
          {workspace.mode === 'atlas' && (versionId
            ? <AtlasEvidence data={scoped} versionId={versionId} onSelectVersion={id => openVersion(id)} onOpenData={id => openVersion(id, 'data')} jurisdiction={workspace.jurisdiction} asOf={workspace.asOf} />
            : <ProfileCatalog data={scoped} therapyNodes={nodes.filter((node) => node.entity.type === 'therapy' && conditionMatches.has(node.id))} nodesById={nodesById} onOpenVersion={id => openVersion(id)} onOpenNode={openGraphNode} />)}
        </>}
      </Suspense>
    </main>}
    {aboutOpen && <About meta={graph.meta} onClose={() => setAboutOpen(false)} />}
    {newsletterOpen && <NewsletterSignup onClose={() => setNewsletterOpen(false)} />}
  </div>
}
