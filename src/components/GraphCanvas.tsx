import { useEffect, useRef } from 'react'
import type Cytoscape from 'cytoscape'
import cytoscape from 'cytoscape'
import { buildStylesheet } from '../graph/cytoscapeStyles'
import { getLayout, frameLayout, type LayoutName } from '../graph/layouts'
import { attachElasticPull } from '../graph/elasticPull'
import { enforceFootprintSpacing } from '../graph/declutter'
import { removeTimelineAxis, updateTimelineAxis } from '../graph/timeline'
import { computeStableIslands } from '../graph/stableIslands'
import { atlasTargetLabels, islandConditionLabel } from '../data/atlas-targets'
import type { GraphData } from '../types/entities'

interface Props {
  graph: GraphData
  visibleIds: Set<string>
  showDrafts: boolean
  selectedId: string | null
  highlightedIds: Set<string>
  layoutName: LayoutName
  accessibilityMode: boolean
  darkMode: boolean
  onSelect: (id: string | null) => void
  onCyReady?: (cy: Cytoscape.Core) => void
}

export default function GraphCanvas({
  graph,
  visibleIds,
  showDrafts,
  selectedId,
  highlightedIds,
  layoutName,
  accessibilityMode,
  darkMode,
  onSelect,
  onCyReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Cytoscape.Core | null>(null)
  const layoutNameRef = useRef(layoutName)
  const onSelectRef = useRef(onSelect)
  layoutNameRef.current = layoutName
  onSelectRef.current = onSelect

  // Create the instance once per dataset.
  useEffect(() => {
    if (!containerRef.current) return
    const graphNodes = graph.elements.nodes.map(node => node.data)
    const graphEdges = graph.elements.edges.map(edge => edge.data)
    const nodesById = new Map(graphNodes.map(node => [node.id, node]))
    const islandNodes = graphNodes.map((node, index) => {
      const labels = atlasTargetLabels(node, nodesById, graphEdges)
      return { data: { ...node, islandLabel: node.entity.type === 'condition' ? islandConditionLabel(node) : labels.label, isSharedTarget: labels.shared }, position: { x: (index % 20) * 300, y: Math.floor(index / 20) * 200 } }
    })
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...islandNodes, ...graph.elements.edges],
      style: buildStylesheet({ accessibilityMode, darkMode, stableIslands: layoutName === 'islands' }),
      // Visibility is a React-owned filter. Start from neutral positions and let
      // the visibility effect below run the first real layout on its subset;
      // otherwise Cytoscape lays out every node once before filters are applied.
      layout: { name: 'preset', fit: false },
      minZoom: 0.12,
      maxZoom: 3,
    })
    cyRef.current = cy
    onCyReady?.(cy)

    // Physics-informed elastic pull: dragging a node springs its neighbors along.
    const detachElastic = attachElasticPull(cy, { enabled: () => layoutNameRef.current !== 'islands' })

    // Cache a full-dataset map. Filtering changes visibility, never its coordinates.
    const buildStableMap = () => {
      const nodes = graph.elements.nodes.map(node => node.data)
      const edges = graph.elements.edges.map(edge => edge.data)
      const footprints = new Map<string, { width: number; height: number }>()
      cy.batch(() => {
        cy.nodes().forEach(node => {
          const wasDisplay = node.style('display')
          node.style('display', 'element')
          const box = node.boundingBox({ includeLabels: true, includeEdges: false })
          const position = node.position()
          // Labels sit below icons; reserve the asymmetric extent on both sides
          // of the icon rather than treating the box center as the node center.
          footprints.set(node.id(), { width: 2 * Math.max(position.x - box.x1, box.x2 - position.x), height: 2 * Math.max(position.y - box.y1, box.y2 - position.y) })
          node.style('display', wasDisplay)
        })
      })
      cy.scratch('_stableIslandPositions', computeStableIslands(nodes, edges, footprints))
    }
    buildStableMap()
    cy.scratch('_stableAccessibility', accessibilityMode)
    cy.scratch('_buildStableMap', buildStableMap)

    const relayoutTimeline = () => {
      removeTimelineAxis(cy)
      cy.scratch('_timelineLayoutState', null)
      cy.elements(':visible').layout(getLayout('timeline')).run()
    }

    // Timeline needs footprint cleanup; Islands reuses its cached coordinates.
    const declutterAndFit = () => {
      if (cyRef.current !== cy) return
      if (layoutNameRef.current === 'timeline') {
        enforceFootprintSpacing(cy, { verticalOnly: true, excludeTimelineAxis: true })
        updateTimelineAxis(cy)
      } else if (layoutNameRef.current === 'islands') {
        removeTimelineAxis(cy)
        cy.nodes('[group = "condition"]').lock()
      }
      frameLayout(cy, layoutNameRef.current, { readable: true })
    }
    cy.on('layoutstop', declutterAndFit)

    // A fresh layout owns positions; release the previous Islands hub locks.
    cy.on('layoutstart', () => { cy.nodes().unlock() })

    // Web fonts load asynchronously; until they do, label bounding boxes are
    // measured at the wrong (fallback/zero) size and the de-clutter pass under-
    // separates. Re-run it once the real fonts are ready so footprints are correct.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (cyRef.current !== cy) return
        if (layoutNameRef.current === 'islands') buildStableMap()
        if (layoutNameRef.current === 'islands') cy.elements(':visible').layout(getLayout('islands')).run()
        else if (layoutNameRef.current === 'timeline') relayoutTimeline()
        else declutterAndFit()
      })
    }

    if (import.meta.env.DEV) {
      const w = window as unknown as {
        __cy?: Cytoscape.Core
        __refit?: () => void
      }
      w.__cy = cy
      w.__refit = () => cy.fit(cy.elements(':visible'), 45)
    }

    // The flex container can finish sizing after Cytoscape initializes, so the
    // layout's built-in fit may frame against stale dimensions. Re-fit on the
    // next frame once the container has its final size.
    requestAnimationFrame(() => {
      if (cyRef.current !== cy) return
      frameLayout(cy, layoutNameRef.current, { readable: true })
    })

    cy.on('tap', 'node', (evt) => {
      if (evt.target.data('isTimelineAxis')) return
      onSelectRef.current(evt.target.id())
    })
    cy.on('tap', (evt) => {
      if (evt.target === cy) onSelectRef.current(null)
    })

    return () => {
      cy.off('layoutstop', declutterAndFit)
      detachElastic()
      cy.destroy()
      cyRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph])

  // Theme/accessibility updates refresh Cytoscape in place so graph positions,
  // filters, and the user's current selection remain intact.
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.style(buildStylesheet({ accessibilityMode, darkMode, stableIslands: layoutName === 'islands' })).update()
    if (layoutName === 'islands' && cy.scratch('_stableAccessibility') !== accessibilityMode) {
      cy.scratch('_buildStableMap')?.()
      cy.scratch('_stableAccessibility', accessibilityMode)
      cy.elements(':visible').layout(getLayout('islands')).run()
    }
    if (layoutNameRef.current === 'timeline') {
      removeTimelineAxis(cy)
      cy.scratch('_timelineLayoutState', null)
      cy.elements(':visible').layout(getLayout('timeline')).run()
    } else {
      frameLayout(cy, layoutNameRef.current, { readable: true })
    }
  }, [accessibilityMode, darkMode, layoutName])

  // Toggle node visibility on filter/layout change; relayout the visible subset.
  // Timeline mode shows dated therapies/trials plus the condition/anatomy tier.
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    removeTimelineAxis(cy)
    cy.scratch('_timelineLayoutState', null)
    cy.batch(() => {
      cy.nodes().forEach((n) => {
        const hasTimelineDate = Boolean(n.data('timelineDate'))
        const isTimelineCondition = n.data('group') === 'condition'
        const shown =
          visibleIds.has(n.id()) &&
          (layoutName !== 'timeline' || hasTimelineDate || isTimelineCondition)
        n.style('display', shown ? 'element' : 'none')
        n.toggleClass(
          'timeline-node',
          layoutName === 'timeline' && shown && !n.data('isTimelineAxis'),
        )
      })
      cy.edges().forEach(edge => { edge.style('display', showDrafts || !edge.data('isDraft') ? 'element' : 'none') })
      const nodes = graph.elements.nodes.map(node => node.data)
      const byId = new Map(nodes.map(node => [node.id, node]))
      const edges = graph.elements.edges.map(edge => edge.data).filter(edge => showDrafts || !edge.isDraft)
      cy.nodes().forEach(node => {
        const labels = atlasTargetLabels(node.data(), byId, edges)
        node.data('islandLabel', node.data('group') === 'condition' ? islandConditionLabel(node.data()) : labels.label)
        node.data('isSharedTarget', labels.shared)
      })
    })
    // Lay out only rendered elements, including on the initial mount.
    cy.elements(':visible').layout(getLayout(layoutName)).run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds, layoutName, showDrafts])

  // Neighborhood highlight for a selected node, or a multi-node focus for a
  // selected news item. News focus deliberately does not pull in each node's
  // whole neighborhood: only the entities explicitly linked by the curator are
  // emphasized, so the story-to-graph mapping stays honest.
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    const applyFocus = () => {
      cy.elements().removeClass('faded sel news-hit hl')

      if (selectedId) {
        cy.resize()
        const node = cy.getElementById(selectedId)
        if (node.empty()) return
        const connections = node.connectedEdges().filter(edge => edge.visible())
        const hood = node.union(connections).union(connections.connectedNodes().filter(':visible'))
        cy.elements().not(hood).addClass('faded')
        node.addClass('sel')
        hood.edges().addClass('hl')
        cy.animate({ center: { eles: node }, duration: 300, easing: 'ease-out' })
        return
      }

      if (highlightedIds.size === 0) return
      let highlighted = cy.collection()
      for (const id of highlightedIds) {
        const node = cy.getElementById(id)
        if (!node.empty() && node.visible()) highlighted = highlighted.merge(node)
      }
      if (highlighted.empty()) return

      cy.elements().not(highlighted).addClass('faded')
      highlighted.addClass('news-hit')
      if (highlighted.length === 1) {
        cy.animate({ center: { eles: highlighted }, duration: 300, easing: 'ease-out' })
      } else {
        cy.animate({ fit: { eles: highlighted, padding: 110 }, duration: 350, easing: 'ease-out' })
      }
    }

    applyFocus()
    // Filter changes can kick off a fresh layout after this effect. Re-apply the
    // focus after layoutstop so layout framing cannot move the linked nodes back
    // off screen.
    if (selectedId || highlightedIds.size > 0) cy.on('layoutstop', applyFocus)
    return () => {
      cy.off('layoutstop', applyFocus)
    }
  }, [highlightedIds, selectedId, showDrafts, visibleIds])

  return <div ref={containerRef} className="graph-canvas" role="img" aria-label="Interactive structural heart network. Use search or connection buttons to inspect a node and its sources." />
}
