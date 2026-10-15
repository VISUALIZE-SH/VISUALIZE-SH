import type { GraphEdgeData, GraphNodeData } from '../types/entities'

export interface IslandPosition { x: number; y: number }
export interface IslandFootprint { width: number; height: number }

// Adjacent entries form clinical neighborhoods; this is a presentation order,
// not an asserted disease hierarchy. Unknown categories receive a sorted slot.
const NEIGHBORHOODS = [
  'Atrial fibrillation / stroke prevention', 'Septal & congenital defect',
  'Pulmonary valve disease', 'Tricuspid valve disease', 'Mitral valve disease',
  'Prosthetic valve complication', 'Aortic valve disease', 'Coronary microvascular',
  'Heart failure', 'Cardiomyopathy', 'Infiltrative cardiomyopathy', 'Hypertension',
]
const THERAPIES = new Set(['device', 'pharmaceutical', 'digital', 'procedure'])
const CORPORATE = new Set(['invested_in', 'acquired', 'option_to_acquire', 'portfolio_includes', 'terminated_acquisition'])
const TAU = Math.PI * 2
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0

function fraction(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619)
  return (hash >>> 0) / 0x100000000
}

/** Exact recorded therapy membership only. No traversal through other entities. */
export function directConditionTargets(nodes: GraphNodeData[], edges: GraphEdgeData[]): Map<string, string[]> {
  const groups = new Map(nodes.map((node) => [node.id, node.group]))
  const targets = new Map<string, Set<string>>()
  for (const node of [...nodes].sort((a, b) => compare(a.id, b.id))) targets.set(node.id, new Set())
  for (const edge of edges) {
    if ((edge.relationship === 'treats' || edge.relationship === 'investigated_for') &&
      THERAPIES.has(groups.get(edge.source) ?? '') && groups.get(edge.target) === 'condition') {
      targets.get(edge.source)?.add(edge.target)
    }
  }
  return new Map([...targets].map(([id, values]) => [id, [...values].sort(compare)]))
}

export function directTargetIds(nodeId: string, edges: GraphEdgeData[], nodes: GraphNodeData[]): string[] {
  return directConditionTargets(nodes, edges).get(nodeId) ?? []
}

type Weights = Map<string, number>
function add(target: Weights, ids: Iterable<string>, weight = 1): void {
  for (const id of ids) target.set(id, (target.get(id) ?? 0) + weight)
}

interface Body extends IslandPosition {
  id: string
  hx: number
  hy: number
  width: number
  height: number
  mobility: number
}

/**
 * Compute once from the FULL graph, then reuse the returned positions when
 * filtering. No visibility state, random seeds, Cytoscape mutations, or timers.
 * Condition anchors depend on direct membership density, never label metrics.
 * Company/trial context is for positioning only and cannot add therapy targets.
 */
export function computeStableIslands(
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  footprints?: Map<string, IslandFootprint>,
): Map<string, IslandPosition> {
  const sorted = [...nodes].sort((a, b) => compare(a.id, b.id))
  const byId = new Map(sorted.map((node) => [node.id, node]))
  const orderedEdges = [...edges].sort((a, b) => compare(a.id, b.id) || compare(a.source, b.source) || compare(a.target, b.target) || compare(a.relationship, b.relationship))
  const direct = directConditionTargets(sorted, orderedEdges)
  const density = new Map(sorted.filter((node) => node.group === 'condition').map((node) => [node.id, 0]))
  for (const ids of direct.values()) for (const id of ids) density.set(id, (density.get(id) ?? 0) + 1 / ids.length)

  const categories = [...new Set(sorted.filter((node) => node.group === 'condition').map((node) => node.category ?? 'Other'))]
  categories.sort((a, b) => {
    const ai = NEIGHBORHOODS.indexOf(a)
    const bi = NEIGHBORHOODS.indexOf(b)
    return (ai < 0 ? NEIGHBORHOODS.length : ai) - (bi < 0 ? NEIGHBORHOODS.length : bi) || compare(a, b)
  })
  const conditions = sorted.filter((node) => node.group === 'condition').sort((a, b) =>
    categories.indexOf(a.category ?? 'Other') - categories.indexOf(b.category ?? 'Other') || compare(a.id, b.id))
  const radius = new Map(conditions.map((node) => [node.id, 110 + 28 * Math.sqrt(density.get(node.id) ?? 0)]))
  const anchors = new Map<string, IslandPosition>()
  if (conditions.length <= 2) {
    const distance = conditions.reduce((sum, node) => sum + radius.get(node.id)!, 0) + 180
    for (const [index, node] of conditions.entries()) anchors.set(node.id,
      { x: conditions.length === 1 ? 0 : (index === 0 ? -1 : 1) * distance / 2, y: 0 })
  } else {
    // A loose serpentine fills the center instead of leaving a large empty
    // perimeter ring. Consecutive clinical categories stay neighbors even at
    // row turns; dense islands reserve wider cells and taller row clearances.
    const rowCount = Math.max(1, Math.round(Math.sqrt(conditions.length / 1.35)))
    const rows: GraphNodeData[][] = []
    let next = 0
    for (let row = 0; row < rowCount; row++) {
      const count = Math.ceil((conditions.length - next) / (rowCount - row))
      rows.push(conditions.slice(next, next + count))
      next += count
    }
    let y = 0
    let previousRadius = 0
    for (const [rowIndex, row] of rows.entries()) {
      const rowRadius = Math.max(...row.map((node) => radius.get(node.id)!))
      if (rowIndex) y += previousRadius + rowRadius + 110
      const width = row.reduce((sum, node) => sum + 2 * radius.get(node.id)! + 110, 0) - 110
      let x = -width / 2
      const direction = rowIndex % 2 ? -1 : 1
      const stagger = (fraction(`row:${rowIndex}`) - 0.5) * 130
      for (const node of row) {
        const r = radius.get(node.id)!
        anchors.set(node.id, {
          x: direction * (x + r) + stagger + (fraction(`${node.id}:x`) - 0.5) * 40,
          y: y + (fraction(`${node.id}:y`) - 0.5) * 80,
        })
        x += 2 * r + 110
      }
      previousRadius = rowRadius
    }
    const centerY = y / 2
    for (const position of anchors.values()) position.y -= centerY
  }

  // Context stays in a separate map. A manufacturer never feeds targets back to
  // its products; evaluated products never feed targets back to other products.
  const context = new Map(sorted.map((node) => [node.id, new Map<string, number>()]))
  for (const node of sorted) {
    add(context.get(node.id)!, direct.get(node.id) ?? [])
    if (node.group === 'condition') add(context.get(node.id)!, [node.id])
  }
  for (const edge of orderedEdges) {
    const source = byId.get(edge.source)
    const target = byId.get(edge.target)
    if (edge.relationship === 'made_by' && source && THERAPIES.has(source.group) && target?.group === 'company') {
      add(context.get(target.id)!, direct.get(source.id) ?? [])
    }
    if (source?.group === 'trial') {
      if (edge.relationship === 'studies' && target?.group === 'condition') add(context.get(source.id)!, [target.id])
      if (edge.relationship === 'evaluates' && target && THERAPIES.has(target.group)) add(context.get(source.id)!, direct.get(target.id) ?? [], 0.7)
    }
  }
  // One corporate hop, from an immutable snapshot, avoids order-dependent or
  // circular propagation through investment syndicates and portfolio networks.
  const baseContext = new Map([...context].map(([id, weights]) => [id, new Map(weights)]))
  for (const edge of orderedEdges) {
    if (!CORPORATE.has(edge.relationship)) continue
    for (const [ownId, otherId] of [[edge.source, edge.target], [edge.target, edge.source]]) {
      if (byId.get(ownId)?.group !== 'company') continue
      for (const [condition, weight] of baseContext.get(otherId) ?? []) add(context.get(ownId)!, [condition], weight * 0.4)
    }
  }

  const buckets = new Map<string, GraphNodeData[]>()
  for (const node of sorted) {
    if (!THERAPIES.has(node.group)) continue
    const ids = direct.get(node.id) ?? []
    if (ids.length) {
      const key = `${node.group === 'procedure' ? 'procedure' : 'therapy'}:${ids.join('|')}`
      const bucket = buckets.get(key) ?? []
      bucket.push(node)
      buckets.set(key, bucket)
    }
  }
  const homes = new Map<string, IslandPosition>(anchors)
  for (const bucket of buckets.values()) for (const [rank, node] of bucket.entries()) {
    const ids = direct.get(node.id)!
    const center = centroid(new Map(ids.map((id) => [id, 1])), anchors)
    const angle = rank * GOLDEN_ANGLE + fraction(node.id) * TAU
    if (ids.length === 1) {
      const islandRadius = radius.get(ids[0])!
      const distance = node.group === 'procedure'
        ? 68 + 28 * Math.sqrt(rank + 1)
        : islandRadius * (0.4 + 0.6 * Math.sqrt((rank + 0.6) / bucket.length))
      homes.set(node.id, { x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance })
    } else if (ids.length === 2) {
      const a = anchors.get(ids[0])!
      const b = anchors.get(ids[1])!
      const length = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const ux = (b.x - a.x) / length
      const uy = (b.y - a.y) / length
      const along = (fraction(`${node.id}:along`) - 0.5) * Math.min(100, length * 0.12)
      const across = (rank - (bucket.length - 1) / 2) * 78 + (fraction(node.id) - 0.5) * 24
      homes.set(node.id, { x: center.x + ux * along - uy * across, y: center.y + uy * along + ux * across })
    } else {
      const distance = 52 * Math.sqrt(rank + 0.6)
      homes.set(node.id, { x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance })
    }
  }

  let orphanIndex = 0
  const orphanY = conditions.length ? Math.max(...[...anchors.values()].map((p) => p.y)) + Math.max(...radius.values()) + 650 : 0
  for (const node of sorted) {
    if (homes.has(node.id)) continue
    const weights = context.get(node.id)!
    if (weights.size && (node.group === 'company' || node.group === 'trial')) {
      const center = centroid(weights, anchors)
      const angle = fraction(node.id) * TAU
      const islandRadius = [...weights.keys()].reduce((sum, id) => sum + (radius.get(id) ?? 140), 0) / weights.size
      const distance = weights.size === 1 ? islandRadius + 100 + fraction(`${node.id}:radius`) * 120 : 110 + fraction(`${node.id}:radius`) * 150
      homes.set(node.id, { x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance })
    } else {
      const angle = orphanIndex * GOLDEN_ANGLE
      const distance = 90 * Math.sqrt(orphanIndex++)
      homes.set(node.id, { x: Math.cos(angle) * distance, y: orphanY + Math.sin(angle) * distance })
    }
  }

  const bodies: Body[] = sorted.map((node) => {
    const home = homes.get(node.id)!
    const footprint = footprints?.get(node.id)
    const width = finiteSize(footprint?.width, Math.max(60, Math.min(240, node.label.length * 6.2)))
    const height = finiteSize(footprint?.height, node.group === 'condition' ? 68 : 52)
    return { id: node.id, ...home, hx: home.x, hy: home.y, width, height,
      mobility: node.group === 'condition' ? 0 : node.group === 'company' || node.group === 'trial' ? 1 : (direct.get(node.id)?.length ?? 0) > 1 ? 0.25 : 0.55 }
  })
  relaxFootprints(bodies)
  return new Map(bodies.map(({ id, x, y }) => [id, { x, y }]))
}

function centroid(weights: Weights, anchors: Map<string, IslandPosition>): IslandPosition {
  let x = 0, y = 0, total = 0
  for (const [id, weight] of [...weights].sort(([a], [b]) => compare(a, b))) {
    const anchor = anchors.get(id)
    if (!anchor) continue
    x += anchor.x * weight
    y += anchor.y * weight
    total += weight
  }
  return total ? { x: x / total, y: y / total } : { x: 0, y: 0 }
}

function finiteSize(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? Math.min(value, 10000) : fallback
}

function relaxFootprints(bodies: Body[]): void {
  // Place shared therapies at their semantic bridge homes first, then other
  // therapies, then company/trial context. Context cannot push a therapy away
  // from its targets. Choose the nearest clear boundary candidate when a home
  // is occupied; fixed anchors never move. Organic variation is in the homes.
  const placed = bodies.filter((body) => !body.mobility)
  const mobile = bodies.filter((body) => body.mobility).sort((a, b) => a.mobility - b.mobility || compare(a.id, b.id))
  for (const body of mobile) {
    body.x = body.hx
    body.y = body.hy
    const clear = (point: IslandPosition) => placed.every((other) =>
      Math.abs(point.x - other.x) >= (body.width + other.width) / 2 + 12 ||
      Math.abs(point.y - other.y) >= (body.height + other.height) / 2 + 12)
    if (!clear(body)) {
      const candidates: IslandPosition[] = [{ x: body.hx, y: body.hy }]
      for (const other of placed) {
        const dx = (body.width + other.width) / 2 + 12.2
        const dy = (body.height + other.height) / 2 + 12.2
        candidates.push(
          { x: other.x - dx, y: body.hy }, { x: other.x + dx, y: body.hy },
          { x: body.hx, y: other.y - dy }, { x: body.hx, y: other.y + dy },
        )
      }
      candidates.sort((a, b) => Math.hypot(a.x - body.hx, a.y - body.hy) - Math.hypot(b.x - body.hx, b.y - body.hy) || a.x - b.x || a.y - b.y)
      const free = candidates.find(clear)
      if (free) { body.x = free.x; body.y = free.y }
    }
    placed.push(body)
  }
}
