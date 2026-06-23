// Label-aware de-clutter + organic jitter + island spacing.
//
// Run after every layout to make the graph readable and natural-looking:
//
//   1. declutterOverlaps() — a short d3-force collision pass that separates nodes by
//      their **label-inclusive** footprint (circumscribing-circle radius), so big
//      `pulse` labels never cover neighboring icons. A weak forceX/forceY holds the
//      layout's structure. A coherent **simplex-noise displacement field** warps the
//      home positions first, so the result doesn't read as a regular grid — nearby
//      nodes drift together (the field is low-frequency), so shifts are never abrupt,
//      and the jitter amount itself varies gradually across space.
//   2. spaceIslands() — pushes disconnected components outward so their isolation is
//      visually perceptible.
//
// Everything ticks synchronously (no rAF timer) so it's deterministic and works even
// when the tab is backgrounded.
import {
  forceCollide,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force'
import { createNoise2D } from 'simplex-noise'
import type { Core, NodeSingular } from 'cytoscape'

interface DNode extends SimulationNodeDatum {
  id: string
  /** collision radius derived from the label-inclusive footprint */
  r: number
  /** home (post-layout, jittered) position the node is gently pulled back toward */
  hx: number
  hy: number
}

// Deterministic PRNG -> stable noise field across reloads/relayouts (so the graph
// doesn't reshuffle its character every time).
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const noise2D = createNoise2D(mulberry32(1337))

export interface DeclutterOptions {
  /** number of synchronous simulation steps */
  iterations?: number
  /** extra clearance (model px) added to each footprint radius */
  padding?: number
  /** strength (0–1) of the pull back toward the layout position */
  homeStrength?: number
  /** collision solver sub-iterations per step */
  collideIterations?: number
  /** scales the circumscribing radius (1 = exactly enclose the footprint box) */
  radiusScale?: number
  /** max organic jitter amplitude (model px); 0 disables */
  jitter?: number
  /** spatial wavelength (model px) of the jitter field — larger = smoother/broader */
  jitterWavelength?: number
}

const BB_OPTS = {
  includeLabels: true,
  includeNodes: true,
  includeEdges: false,
  includeOverlays: false,
}

/** Relax node positions so label-inclusive footprints stop overlapping, with a
 *  coherent organic warp applied so the result doesn't look grid-like. */
export function declutterOverlaps(cy: Core, opts: DeclutterOptions = {}): void {
  const iterations = opts.iterations ?? 240
  const padding = opts.padding ?? 3
  const homeStrength = opts.homeStrength ?? 0.06
  const collideIterations = opts.collideIterations ?? 3
  const radiusScale = opts.radiusScale ?? 1
  const jitter = opts.jitter ?? 16
  const wavelength = opts.jitterWavelength ?? 620

  const isVisible = (n: NodeSingular) => n.style('display') !== 'none'
  const f = 1 / wavelength

  const nodes: DNode[] = []
  cy.nodes().forEach((n) => {
    if (!isVisible(n)) return
    const p = n.position()
    const bb = n.boundingBox(BB_OPTS)
    // Circle that *circumscribes* the (icon + label) box: radius = half the box
    // diagonal. Because each footprint box is fully inside its circle, once the
    // collision force separates the circles the boxes provably cannot overlap.
    const r = radiusScale * 0.5 * Math.hypot(bb.w, bb.h) + padding

    // Coherent jitter: a low-frequency 2D simplex vector field. Two decorrelated
    // channels give the displacement direction; a third, broader channel modulates
    // the amount so the jitter strength itself varies gradually across the canvas.
    let hx = p.x
    let hy = p.y
    if (jitter > 0) {
      const dirX = noise2D(p.x * f, p.y * f)
      const dirY = noise2D(p.x * f + 1000, p.y * f + 1000)
      const amount = 0.3 + 0.7 * (0.5 + 0.5 * noise2D(p.x * f * 0.5 - 4000, p.y * f * 0.5 - 4000))
      hx += jitter * amount * dirX
      hy += jitter * amount * dirY
    }
    nodes.push({ id: n.id(), x: hx, y: hy, hx, hy, r })
  })
  if (nodes.length < 2) return

  const sim = forceSimulation<DNode>(nodes)
    .alpha(1)
    .alphaDecay(0) // constant energy; iteration count controls convergence
    .velocityDecay(0.3)
    .force(
      'collide',
      forceCollide<DNode>((d) => d.r).strength(1).iterations(collideIterations),
    )
    .force('x', forceX<DNode>((d) => d.hx).strength(homeStrength))
    .force('y', forceY<DNode>((d) => d.hy).strength(homeStrength))
    .stop()

  for (let i = 0; i < iterations; i++) sim.tick()
  sim.stop()

  cy.batch(() => {
    for (const d of nodes) {
      const n = cy.getElementById(d.id)
      if (n.nonempty()) n.position({ x: d.x ?? d.hx, y: d.y ?? d.hy })
    }
  })
}

export interface IslandSpacingOptions {
  /** whitespace (model px) to push each disconnected component outward */
  gap?: number
}

function centroid(nodes: cytoscapeCollection): { x: number; y: number } {
  let x = 0
  let y = 0
  let n = 0
  nodes.forEach((node) => {
    const p = node.position()
    x += p.x
    y += p.y
    n++
  })
  return { x: x / (n || 1), y: y / (n || 1) }
}

// (typing helper) the subset of Cytoscape's collection API we use here
type cytoscapeCollection = ReturnType<Core['nodes']>

/**
 * Push disconnected components (islands) outward from the global centroid so their
 * isolation reads visually. Cheap: one components() pass (O(V+E)) + a translate.
 * Returns the number of connected components found.
 */
export function spaceIslands(cy: Core, opts: IslandSpacingOptions = {}): number {
  const gap = opts.gap ?? 110
  const comps = cy.elements(':visible').components()
  if (comps.length < 2) return comps.length

  // The main mass = the component with the most nodes; everything else is an island.
  let main = comps[0]
  for (const c of comps) if (c.nodes().length > main.nodes().length) main = c

  const g = centroid(cy.nodes(':visible'))

  cy.batch(() => {
    comps.forEach((c, i) => {
      if (c === main) return
      const cn = c.nodes()
      const ci = centroid(cn)
      let dx = ci.x - g.x
      let dy = ci.y - g.y
      let len = Math.hypot(dx, dy)
      if (len < 1) {
        // Island sitting on the centroid — fan it out in a deterministic direction.
        const ang = (i * 137.50776) * (Math.PI / 180) // golden-angle spread
        dx = Math.cos(ang)
        dy = Math.sin(ang)
        len = 1
      }
      const ux = dx / len
      const uy = dy / len
      cn.forEach((n) => {
        const p = n.position()
        n.position({ x: p.x + ux * gap, y: p.y + uy * gap })
      })
    })
  })
  return comps.length
}
