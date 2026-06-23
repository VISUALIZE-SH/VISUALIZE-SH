// Condition-anchored clustering — physics-based "islands" around disease states.
//
// Goal: nodes connected to a particular disease state (the purple `condition`
// nodes) gather into a visible island around that condition, and the islands
// for different conditions sit apart from each other. Nodes that belong to more
// than one condition (e.g. a device that treats two conditions, or a company
// whose products span several) are pulled only weakly, toward the *average* of
// their conditions, so they linger in the space between islands instead of
// committing to one.
//
// How it works
//   • Each visible condition node is treated as a fixed anchor at its current
//     (post-fcose) position. Pinning the anchors makes this pass **idempotent**:
//     re-running it (on font load, accessibility toggle, etc.) converges to the
//     same arrangement instead of drifting.
//   • Every other visible node is assigned a weighted set of "associated"
//     conditions via a short breadth-first walk (≤ maxHops), with the weight of
//     each condition falling off by `hopFalloff` per hop. So a therapy that
//     `treats` one condition is locked to it (1 hop, weight 1); a trial that
//     `studies` two conditions splits between them; a company reaches its
//     conditions at 2 hops (company→therapy→condition) and floats among them.
//   • The node is pulled (forceX/forceY) toward the weighted centroid of its
//     associated conditions. The pull strength scales with "monogamy"
//     (top-weight ÷ total-weight): single-condition nodes pull hard and form
//     tight islands; multi-condition nodes pull weakly and stay loose/between.
//   • A collision force keeps nodes from stacking. Everything ticks
//     synchronously (no rAF) so it's deterministic and tab-backgrounding-safe,
//     matching declutter.ts.
//
// Runs after the layout, *before* declutterOverlaps (which then separates the
// label footprints locally without undoing the island structure).
import {
  forceCollide,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force'
import type { Core, NodeSingular } from 'cytoscape'

interface CNode extends SimulationNodeDatum {
  id: string
  /** collision radius from the node icon footprint */
  r: number
  isCondition: boolean
  /** cluster target = weighted centroid of associated condition anchors */
  tx: number
  ty: number
  /** attraction strength toward (tx,ty), 0–1; 0 = no pull (pinned or orphan) */
  pull: number
}

export interface ClusterOptions {
  /** number of synchronous simulation steps */
  iterations?: number
  /** max attraction strength toward the cluster target (for a single-condition node) */
  pullStrength?: number
  /** exponent on monogamy; >1 makes shared nodes hang back more */
  monogamyExp?: number
  /** how many hops out to search for associated conditions */
  maxHops?: number
  /** per-hop weight falloff for an associated condition */
  hopFalloff?: number
  /** extra clearance (model px) added to each collision radius */
  collidePadding?: number
  /** collision force strength, 0–1 */
  collideStrength?: number
  /**
   * One-time radial spread of the condition anchors about the layout centroid
   * (1 = leave fcose spacing as-is). Applied once per layout so islands get room
   * between them; gated by a scratch flag so re-runs (fonts/accessibility) don't
   * compound it. Pass `forceSpread: true` to apply it regardless of the flag.
   */
  conditionSpread?: number
  forceSpread?: boolean
}

// Scratch key: set once the condition anchors have been spread for the current
// layout, so idempotent re-runs don't keep inflating the spacing. GraphCanvas
// clears it on every `layoutstart`.
const SPREAD_FLAG = '_clusterCondSpread'

const isVisible = (n: NodeSingular) => n.style('display') !== 'none'
const isCondition = (n: NodeSingular) => n.data('group') === 'condition'

/**
 * Pull each node into an island around the condition(s) it is connected to.
 * Condition nodes are pinned; satellites are attracted to the weighted centroid
 * of their associated conditions. Idempotent (re-running converges).
 */
export function clusterByCondition(cy: Core, opts: ClusterOptions = {}): void {
  const iterations = opts.iterations ?? 220
  const pullStrength = opts.pullStrength ?? 0.85
  const monogamyExp = opts.monogamyExp ?? 2
  const maxHops = opts.maxHops ?? 3
  const hopFalloff = opts.hopFalloff ?? 0.5
  const collidePadding = opts.collidePadding ?? 4
  const collideStrength = opts.collideStrength ?? 0.8
  const conditionSpread = opts.conditionSpread ?? 1.42

  // Visible adjacency (undirected) over visible edges only.
  const adj = new Map<string, string[]>()
  const visNodes: NodeSingular[] = []
  cy.nodes().forEach((n) => {
    if (!isVisible(n)) return
    visNodes.push(n)
    adj.set(n.id(), [])
  })
  if (visNodes.length < 3) return
  cy.edges().forEach((e) => {
    if (e.style('display') === 'none') return
    const s = e.source().id()
    const t = e.target().id()
    const a = adj.get(s)
    const b = adj.get(t)
    if (a && b) {
      a.push(t)
      b.push(s)
    }
  })

  const conditionNodes = visNodes.filter(isCondition)
  const conditionIds = new Set(conditionNodes.map((n) => n.id()))
  if (conditionIds.size < 2) return // nothing to cluster around

  // One-time radial spread of the condition anchors, so the islands have room
  // between them. Done before computing satellite targets so they aim at the
  // post-spread anchor positions. Gated so re-runs don't compound the spacing.
  if (conditionSpread !== 1 && (opts.forceSpread || !cy.scratch(SPREAD_FLAG))) {
    let gx = 0
    let gy = 0
    conditionNodes.forEach((n) => {
      const p = n.position()
      gx += p.x
      gy += p.y
    })
    gx /= conditionNodes.length
    gy /= conditionNodes.length
    cy.batch(() => {
      conditionNodes.forEach((n) => {
        const p = n.position()
        n.position({ x: gx + (p.x - gx) * conditionSpread, y: gy + (p.y - gy) * conditionSpread })
      })
    })
    cy.scratch(SPREAD_FLAG, true)
  }

  const posOf = (id: string) => cy.getElementById(id).position()

  // Weighted set of associated conditions for a node, via BFS up to maxHops.
  // A condition reached at multiple distances keeps its strongest (nearest) weight.
  function associatedConditions(startId: string): Map<string, number> {
    const weights = new Map<string, number>()
    const seen = new Set<string>([startId])
    let frontier = [startId]
    for (let d = 1; d <= maxHops && frontier.length; d++) {
      const next: string[] = []
      for (const u of frontier) {
        for (const v of adj.get(u) ?? []) {
          if (seen.has(v)) continue
          seen.add(v)
          next.push(v)
        }
      }
      const w = Math.pow(hopFalloff, d - 1)
      for (const v of next) {
        if (conditionIds.has(v) && (weights.get(v) ?? 0) < w) weights.set(v, w)
      }
      frontier = next
    }
    return weights
  }

  const nodes: CNode[] = visNodes.map((n) => {
    const p = n.position()
    const r = Math.max(n.width(), n.height()) / 2 + collidePadding
    if (isCondition(n)) {
      // Anchor: pinned in place, exerts no pull of its own.
      return { id: n.id(), x: p.x, y: p.y, fx: p.x, fy: p.y, r, isCondition: true, tx: p.x, ty: p.y, pull: 0 }
    }
    const w = associatedConditions(n.id())
    if (w.size === 0) {
      // Orphan (no reachable condition): leave it where it is.
      return { id: n.id(), x: p.x, y: p.y, r, isCondition: false, tx: p.x, ty: p.y, pull: 0 }
    }
    let sum = 0
    let top = 0
    let cx = 0
    let cy0 = 0
    w.forEach((weight, condId) => {
      const cp = posOf(condId)
      cx += cp.x * weight
      cy0 += cp.y * weight
      sum += weight
      if (weight > top) top = weight
    })
    const monogamy = top / sum // 1 when bound to a single condition, lower when split
    const pull = pullStrength * Math.pow(monogamy, monogamyExp)
    return { id: n.id(), x: p.x, y: p.y, r, isCondition: false, tx: cx / sum, ty: cy0 / sum, pull }
  })

  const sim = forceSimulation<CNode>(nodes)
    .alpha(1)
    .alphaDecay(0) // constant energy; iteration count controls convergence
    .velocityDecay(0.4)
    .force('x', forceX<CNode>((d) => d.tx).strength((d) => d.pull))
    .force('y', forceY<CNode>((d) => d.ty).strength((d) => d.pull))
    .force(
      'collide',
      forceCollide<CNode>((d) => d.r).strength(collideStrength).iterations(2),
    )
    .stop()

  for (let i = 0; i < iterations; i++) sim.tick()
  sim.stop()

  cy.batch(() => {
    for (const d of nodes) {
      const n = cy.getElementById(d.id)
      if (n.nonempty()) n.position({ x: d.x ?? d.tx, y: d.y ?? d.ty })
    }
  })
}
