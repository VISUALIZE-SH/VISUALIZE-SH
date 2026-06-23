import { useEffect, useRef } from 'react'
import type Cytoscape from 'cytoscape'
import cytoscape from '../graph/cytoscapeSetup'
import { buildStylesheet } from '../graph/cytoscapeStyles'
import { getLayout, type LayoutName } from '../graph/layouts'
import { attachElasticPull } from '../graph/elasticPull'
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

    if (import.meta.env.DEV) {
      ;(window as unknown as { __cy?: Cytoscape.Core }).__cy = cy
    }

    // The flex container can finish sizing after Cytoscape initializes, so the
    // layout's built-in fit may frame against stale dimensions. Re-fit on the
    // next frame once the container has its final size.
    requestAnimationFrame(() => {
      if (cyRef.current !== cy) return
      cy.resize()
      cy.fit(undefined, 45)
    })

    cy.on('tap', 'node', (evt) => onSelect(evt.target.id()))
    cy.on('tap', (evt) => {
      if (evt.target === cy) onSelect(null)
    })

    return () => {
      detachElastic()
      cy.destroy()
      cyRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph])

  // Re-run layout when the user switches it.
  useEffect(() => {
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
