// Builds the Cytoscape stylesheet from the shared palette. Node color/shape come
// from GROUP_META; size scales with degree; drafts get a dashed border; the
// `.faded` / `.sel` / `.hl` classes drive the neighborhood-highlight interaction.
//
// Typed as `any[]` on purpose: the style values use mapData() expressions and
// extension properties that don't line up cleanly across @types/cytoscape
// versions, and Cytoscape accepts a plain {selector, style}[] at runtime.
import { GROUP_META } from './palette'

export function buildStylesheet(): any[] {
  const styles: any[] = [
    {
      selector: 'node',
      style: {
        'background-color': '#9aa0aa',
        label: 'data(label)',
        // Adaptive label: base font scales with "pulse" (newsworthiness), and
        // labels render in model space so they grow/shrink with zoom. Higher-pulse
        // nodes get larger labels, so they stay legible when zoomed out (and the
        // hottest topics surface first on the overview). `min-zoomed-font-size`
        // hides any label whose on-screen size drops below the threshold, which
        // declutters automatically as you zoom out.
        'font-size': 'mapData(pulse, 0, 10, 9, 26)',
        'font-family':
          '"Source Sans 3", "Source Sans Pro", "Open Sans", Helvetica, Arial, sans-serif',
        color: '#110318',
        'text-wrap': 'wrap',
        'text-max-width': '92px',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 3,
        width: 'mapData(degree, 1, 12, 24, 60)',
        height: 'mapData(degree, 1, 12, 24, 60)',
        'border-width': 1,
        'border-color': 'rgba(0,0,0,0.18)',
        'text-outline-color': '#ffffff',
        'text-outline-width': 2,
        // Hide labels that would render smaller than this many px (declutter on
        // zoom-out). High-pulse labels survive longer because their base is larger.
        'min-zoomed-font-size': 6,
        // Draw higher-pulse nodes (and their labels) above lower ones to reduce
        // occlusion of the items that matter most.
        'z-index': 'mapData(pulse, 0, 10, 1, 100)',
        'transition-property': 'opacity',
        'transition-duration': 180,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1.4,
        'curve-style': 'bezier',
        'line-color': '#d2d3db',
        'target-arrow-color': '#d2d3db',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.7,
        opacity: 0.7,
      },
    },
    {
      // truthy boolean data field -> dashed border for draft (uncurated) entities
      selector: 'node[?isDraft]',
      style: {
        'border-width': 2,
        'border-style': 'dashed',
        'border-color': '#110318',
      },
    },
    {
      selector: '.faded',
      style: { opacity: 0.08, 'text-opacity': 0 },
    },
    {
      // Selected node: emphasize border + label, and force the label to always
      // render (min-zoomed-font-size: 0) and sit on top regardless of pulse.
      selector: 'node.sel',
      style: {
        'border-width': 3,
        'border-color': '#110318',
        'font-weight': 'bold',
        'text-outline-width': 2.5,
        'min-zoomed-font-size': 0,
        'z-index': 9999,
      },
    },
    {
      selector: 'edge.hl',
      style: {
        'line-color': '#5b5d66',
        'target-arrow-color': '#5b5d66',
        width: 2,
        opacity: 1,
      },
    },
  ]

  for (const [group, meta] of Object.entries(GROUP_META)) {
    styles.push({
      selector: `node[group = "${group}"]`,
      style: { 'background-color': meta.color, shape: meta.shape },
    })
  }

  return styles
}
