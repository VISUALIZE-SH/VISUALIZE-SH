import { useEffect, useRef } from 'react'
import type Cytoscape from 'cytoscape'
import cytoscape from '../graph/cytoscapeSetup'
import { buildStylesheet } from '../graph/cytoscapeStyles'
import { getLayout, type LayoutName } from '../graph/layouts'
import { attachElasticPull } from '../graph/elasticPull'
import { declutterOverlaps, spaceIslands } from '../graph/declutter'
import { removeTimelineAxis, updateTimelineAxis } from '../graph/timeline'
import type { GraphData } from '../types/entities'

interface Props {
  graph: GraphData
  visibleIds: Set<string>
  selectedId: string | null
  layoutName: LayoutName
  accessibilityMode: boolean
  onSelect: (id: string | null) => void
  onCyReady?: (cy: Cytoscape.Core) => void
}

export default function GraphCanvas({
  graph,
  visibleIds,
  selectedId,
  layoutName,
  accessibilityMode,
  onSelect,
  onCyReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Cytoscape.Core | null>(null)
  const didMount = useRef(false)
  const layoutNameRef = useRef(layoutName)
  layoutNameRef.current = layoutName

  // Create the instance once per dataset.
  useEffect(() => {
    if (!containerRef.current) return
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...graph.elements.nodes, ...graph.elements.edges],
      style: buildStylesheet({ accessibilityMode }),
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
      if (layoutNameRef.current === 'timeline') {
        updateTimelineAxis(cy)
      } else {
        removeTimelineAxis(cy)
        declutterOverlaps(cy)
        spaceIslands(cy)
      }
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

    cy.on('tap', 'node', (evt) => {
      if (evt.target.data('isTimelineAxis')) return
      onSelect(evt.target.id())
    })
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

  // Accessibility mode changes label size inside the Cytoscape canvas as well as
  // DOM text. Refresh the stylesheet in place so graph state is preserved.
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.style(buildStylesheet({ accessibilityMode })).update()
    if (layoutNameRef.current === 'timeline') {
      updateTimelineAxis(cy)
    } else {
      declutterOverlaps(cy)
      spaceIslands(cy)
    }
    cy.resize()
    cy.fit(cy.elements(':visible'), 45)
  }, [accessibilityMode])

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
    })
    // The create effect already laid out the full graph; skip the duplicate run.
    if (!didMount.current) {
      didMount.current = true
      return
    }
    cy.layout(getLayout(layoutName)).run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds, layoutName])

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
