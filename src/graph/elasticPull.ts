// Elastic pull — physics-informed node dragging.
//
// When you grab and drag a node, the connected nodes are pulled along as if every
// edge were a spring: direct neighbors follow most, their neighbors less, and so on
// (proportional falloff through the network). Implemented with **d3-force** (the
// `d3-force` submodule only — a few KB, the state-of-the-art lightweight force
// simulator), driven by Cytoscape's native grab/drag/free events.
//
// How it works
//   • On grab we build a fresh simulation that mirrors the *currently visible*
//     nodes/edges, using each node's current position and each edge's current
//     length as the spring rest-length (so the rest state == the current layout —
//     the simulation only perturbs locally, it does not re-organize the graph).
//   • The grabbed node is pinned to the cursor (fx/fy); link springs pull its
//     neighbors toward it, collision keeps nodes from overlapping.
//   • Each tick writes the simulated positions back into Cytoscape (every node
//     except the grabbed one, which Cytoscape itself is moving).
//   • On release the node stays where it was dropped and the neighborhood settles;
//     the simulation then cools to a stop on its own.
import {
  forceCollide,
  forceLink,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import type { Core, EventObject, NodeSingular } from 'cytoscape'

interface SimNode extends SimulationNodeDatum {
  id: string
}
interface SimLink extends SimulationLinkDatum<SimNode> {
  /** captured rest length = the edge's length at grab time */
  rest: number
}

export interface ElasticPullOptions {
  /** Spring stiffness, 0–1. Lower = stretchier/more elastic. */
  linkStrength?: number
  /** Friction, 0–1. Higher = more damping (less jiggle). */
  velocityDecay?: number
  /** Extra padding (px) added to node radius for collision. */
  collidePadding?: number
}

export function attachElasticPull(cy: Core, opts: ElasticPullOptions = {}): () => void {
  const linkStrength = opts.linkStrength ?? 0.3
  const velocityDecay = opts.velocityDecay ?? 0.45
  const collidePadding = opts.collidePadding ?? 4

  let sim: Simulation<SimNode, SimLink> | null = null
  let byId = new Map<string, SimNode>()
  let grabbedId: string | null = null

  const isVisible = (n: NodeSingular) => n.style('display') !== 'none'
  const radiusOf = (n: NodeSingular) => Math.max(n.width(), n.height()) / 2

  function stopSim() {
    if (sim) {
      sim.on('tick', null)
      sim.stop()
      sim = null
    }
    byId = new Map()
    grabbedId = null
  }

  // Build a simulation from the current visible graph (positions + edge lengths).
  function build() {
    stopSim()
    const nodes: SimNode[] = []
    byId = new Map()
    const radius = new Map<string, number>()
    cy.nodes().forEach((n) => {
      if (!isVisible(n)) return
      const p = n.position()
      const sn: SimNode = { id: n.id(), x: p.x, y: p.y, vx: 0, vy: 0 }
      nodes.push(sn)
      byId.set(n.id(), sn)
      radius.set(n.id(), radiusOf(n))
    })
    if (nodes.length < 2) return

    const links: SimLink[] = []
    cy.edges().forEach((e) => {
      const s = byId.get(e.source().id())
      const t = byId.get(e.target().id())
      if (!s || !t) return
      const rest = Math.max(20, Math.hypot((s.x ?? 0) - (t.x ?? 0), (s.y ?? 0) - (t.y ?? 0)))
      links.push({ source: s.id, target: t.id, rest })
    })

    sim = forceSimulation<SimNode, SimLink>(nodes)
      .velocityDecay(velocityDecay)
      .alpha(0)
      .alphaTarget(0)
      .force(
        'link',
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => l.rest)
          .strength(linkStrength),
      )
      .force(
        'collide',
        forceCollide<SimNode>((d) => (radius.get(d.id) ?? 12) + collidePadding)
          .strength(0.7)
          .iterations(1),
      )
      .on('tick', onTick)
      .stop()
  }

  // Push simulated positions back into Cytoscape (all but the grabbed node).
  function onTick() {
    if (!sim) return
    cy.batch(() => {
      byId.forEach((sn, id) => {
        if (id === grabbedId) return
        const n = cy.getElementById(id)
        if (n.nonempty()) n.position({ x: sn.x ?? 0, y: sn.y ?? 0 })
      })
    })
  }

  function onGrab(e: EventObject) {
    const node = e.target as NodeSingular
    build()
    if (!sim) return
    grabbedId = node.id()
    const sn = byId.get(grabbedId)
    if (sn) {
      sn.fx = sn.x
      sn.fy = sn.y
    }
    sim.alpha(0.5).alphaTarget(0.35).restart()
  }

  function onDrag(e: EventObject) {
    const node = e.target as NodeSingular
    if (node.id() !== grabbedId || !sim) return
    const sn = byId.get(grabbedId)
    if (sn) {
      const p = node.position()
      sn.fx = p.x
      sn.fy = p.y
    }
    // Keep the simulation warm and responsive while the cursor moves.
    sim.alphaTarget(0.35)
    if (sim.alpha() < 0.12) sim.alpha(0.3).restart()
  }

  function onFree(e: EventObject) {
    const node = e.target as NodeSingular
    if (node.id() !== grabbedId || !sim) return
    // Keep the node where it was dropped (stays pinned) and let the neighborhood
    // settle, then cool to a stop. alphaTarget 0 => d3 stops the timer itself.
    grabbedId = null
    sim.alphaTarget(0).alpha(Math.max(sim.alpha(), 0.3)).restart()
  }

  // A new/changed layout owns positions — abandon any in-flight pull.
  function onLayoutStart() {
    stopSim()
  }

  cy.on('grab', 'node', onGrab)
  cy.on('drag', 'node', onDrag)
  cy.on('free', 'node', onFree)
  cy.on('layoutstart', onLayoutStart)

  if (import.meta.env.DEV) {
    // Dev-only deterministic driver: d3's internal timer is rAF-based and pauses
    // in hidden/unfocused tabs, so tests can't observe the animation. tick() runs
    // the physics synchronously; we then flush positions via onTick().
    ;(window as unknown as { __elasticPump?: (n?: number) => number }).__elasticPump =
      (n = 120) => {
        for (let i = 0; i < n; i++) {
          sim?.tick()
          onTick()
        }
        return sim?.alpha() ?? 0
      }
  }

  return () => {
    cy.off('grab', 'node', onGrab)
    cy.off('drag', 'node', onDrag)
    cy.off('free', 'node', onFree)
    cy.off('layoutstart', onLayoutStart)
    stopSim()
  }
}
