// Layout presets. fcose = force-directed clustering (default), dagre = layered
// hierarchy (condition -> therapy -> trial reads left to right), concentric =
// rings by connectedness.
export type LayoutName = 'fcose' | 'dagre' | 'concentric'

export const LAYOUT_LABELS: Record<LayoutName, string> = {
  fcose: 'Clustered',
  dagre: 'Hierarchy',
  concentric: 'Concentric',
}

// Returns plain layout-options objects. Typed as `any` because the extension
// options (fcose/dagre) are not part of Cytoscape's core LayoutOptions type.
//
// animate:false makes the built-in fit accurate (animated layouts can fit
// against mid-flight positions and mis-frame the graph).
export function getLayout(name: LayoutName): any {
  const common = { animate: false, padding: 45, fit: true }
  switch (name) {
    case 'dagre':
      return { name: 'dagre', rankDir: 'LR', nodeSep: 22, rankSep: 80, ...common }
    case 'concentric':
      return {
        name: 'concentric',
        concentric: (n: any) => n.degree(),
        levelWidth: () => 2,
        minNodeSpacing: 24,
        ...common,
      }
    case 'fcose':
    default:
      return {
        name: 'fcose',
        quality: 'proof',
        randomize: true,
        packComponents: true, // keep disconnected clusters from flying apart
        nodeSeparation: 80,
        idealEdgeLength: 68,
        nodeRepulsion: 4500,
        gravity: 0.4,
        gravityRange: 3.2,
        numIter: 2500,
        ...common,
      }
  }
}
