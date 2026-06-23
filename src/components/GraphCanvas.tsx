import { useEffect, useRef } from 'react'
import type Cytoscape from 'cytoscape'
import cytoscape from '../graph/cytoscapeSetup'
import { buildStylesheet } from '../graph/cytoscapeStyles'
import { getLayout, type LayoutName } from '../graph/layouts'
import { attachElasticPull } from '../graph/elasticPull'
import { declutterOverlaps, spaceIslands } from '../graph/declutter'
import type { GraphData } from '../types/entities'

interface Props {
  graph: GraphData
  visibleIds: Set<string>
  selectedId: string | null
  layoutName: LayoutName
  onSelect: (id: string | null) => void
  onCyReady?: (cy: Cytoscape.Core) => void
}

export default function GraphCanvas({
  graph,
  visibleIds,
  selectedId,
  layoutName,
  onSelect,
  onCyReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Cytoscape.Core | null>(null)
  const didMount = useRef(false)
  const didLayoutMount = useRef(false)

  // Create the instance once per dataset.
  useEffect(() => {
    if (!containerRef.current) return
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...graph.elements.nodes, ...graph.elements.edges],
      style: buildStylesheet(),
      layout: getLayout(layoutName),
      wheelSensitivity: 0.2,
      minZoom: 0.12,
      maxZoom: 3,
    })
    cyRef.current = cy
    didMount.current = false
    onCyReady?.(cy)

    // Physics-informed elastic pull: dragging a node springs its neighbors along.
    const detachElastic = attachElasticPull(cy)

    // After any layout: relax label footprints apart (with organic jitter), open up
    // whitespace around disconnected islands, then frame.
    const declutterAndFit = () => {
      if (cyRef.current !== cy) return
      declutterOverlaps(cy)
      spaceIslands(cy)
      cy.resize()
      cy.fit(cy.elements(':visible'), 45)
    }
    cy.on('layoutstop', declutterAndFit)

    // Web fonts load asynchronously; until they do, label bounding boxes are
    // measured at the wrong (fallback/zero) size and the de-clutter pass under-
    // separates. Re-run it once the real fonts are ready so footprints are correct.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (cyRef.current === cy) declutterAndFit()
      })
    }

    if (import.meta.env.DEV) {
      const w = window as unknown as {
        __cy?: Cytoscape.Core
        __declutter?: (o?: Parameters<typeof declutterOverlaps>[1]) => void
        __spaceIslands?: (o?: Parameters<typeof spaceIslands>[1]) => number
        __refit?: () => void
      }
      w.__cy = cy
      w.__declutter = (o) => declutterOverlaps(cy, o)
      w.__spaceIslands = (o) => spaceIslands(cy, o)
      w.__refit = () => cy.fit(cy.elements(':visible'), 45)
    }

    // The flex container can finish sizing after Cytoscape initializes, so the
    // layout's built-in fit may frame against stale dimensions. Re-fit on the
    // next frame once the container has its final size.
    requestAnimationFrame(() => {
      if (cyRef.current !== cy) return
      cy.resize()
      cy.fit(cy.elements(':visible'), 45)
    })

    cy.on('tap', 'node', (evt) => onSelect(evt.target.id()))
    cy.on('tap', (evt) => {
      if (evt.target === cy) onSelect(null)
    })

    return () => {
      cy.off('layoutstop', declutterAndFit)
      detachElastic()
      cy.destroy()
      cyRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph])

  // Re-run layout when the user switches it. Skip the first run — the instance
  // was already laid out (and decluttered) by the create effect.
  useEffect(() => {
    if (!didLayoutMount.current) {
      didLayoutMount.current = true
      return
    }
    cyRef.current?.layout(getLayout(layoutName)).run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutName])

  // Toggle node visibility on filter change; relayout the visible subset.
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.batch(() => {
      cy.nodes().forEach((n) => {
        n.style('display', visibleIds.has(n.id()) ? 'element' : 'none')
      })
    })
    // The create effect already laid out the full graph; skip the duplicate run.
    if (!didMount.current) {
      didMount.current = true
      return
    }
    cy.layout(getLayout(layoutName)).run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds])

  // Neighborhood highlight + recenter on selection.
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.elements().removeClass('faded sel hl')
    if (!selectedId) return
    const node = cy.getElementById(selectedId)
    if (node.empty()) return
    const hood = node.closedNeighborhood()
    cy.elements().not(hood).addClass('faded')
    node.addClass('sel')
    hood.edges().addClass('hl')
    cy.animate({ center: { eles: node }, duration: 300, easing: 'ease-out' })
  }, [selectedId])

  return <div ref={containerRef} className="graph-canvas" />
}
