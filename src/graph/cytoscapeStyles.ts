// Builds the Cytoscape stylesheet from the shared palette. Node color/shape come
// from GROUP_META; size scales with degree; drafts get a dashed border; the
// `.faded` / `.sel` / `.hl` classes drive the neighborhood-highlight interaction.
//
// Typed as `any[]` on purpose: the style values use mapData() expressions and
// extension properties that don't line up cleanly across @types/cytoscape
// versions, and Cytoscape accepts a plain {selector, style}[] at runtime.
import { GROUP_META } from './palette'

interface StylesheetOptions {
  accessibilityMode?: boolean
  darkMode?: boolean
}

function scaled(value: number, scale: number): number {
  return value * scale
}

export function buildStylesheet(options: StylesheetOptions = {}): any[] {
  // Keep graph-rendered labels in step with the 20% larger DOM typography.
  // Accessibility mode remains 50% larger than the regular graph labels.
  const fontScale = options.accessibilityMode ? 2.7 : 1.8
  const ink = options.darkMode ? '#f8f3fa' : '#110318'
  const outline = options.darkMode ? '#09070c' : '#ffffff'
  const edge = options.darkMode ? '#665b70' : '#d2d3db'
  const axis = options.darkMode ? '#584b63' : '#d6cee0'
  const muted = options.darkMode ? '#b6aabd' : '#777777'
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
        'font-size': `mapData(pulse, 0, 10, ${scaled(9, fontScale)}, ${scaled(26, fontScale)})`,
        'font-family':
          '"Source Sans 3", "Source Sans Pro", "Open Sans", Helvetica, Arial, sans-serif',
        color: ink,
        'text-wrap': 'wrap',
        'text-max-width': `${scaled(92, fontScale)}px`,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': scaled(3, fontScale),
        width: 'mapData(degree, 1, 12, 24, 60)',
        height: 'mapData(degree, 1, 12, 24, 60)',
        'border-width': 1,
        'border-color': options.darkMode ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.18)',
        'text-outline-color': outline,
        'text-outline-width': scaled(2, fontScale),
        // Hide labels that would render smaller than this many px (declutter on
        // zoom-out). High-pulse labels survive longer because their base is larger.
        'min-zoomed-font-size': scaled(6, fontScale),
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
        'line-color': edge,
        'target-arrow-color': edge,
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.7,
        opacity: 0.7,
      },
    },
    {
      selector: 'node[?isTimelineAxis]',
      style: {
        width: 2,
        height: 26,
        shape: 'rectangle',
        'background-color': axis,
        'border-width': 0,
        label: 'data(label)',
        'font-size': scaled(24, fontScale),
        'font-weight': 600,
        color: muted,
        'text-outline-color': outline,
        'text-outline-width': scaled(3, fontScale),
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': scaled(12, fontScale),
        'min-zoomed-font-size': 0,
        'z-index': 0,
        events: 'no',
      },
    },
    {
      selector: 'edge[?isTimelineAxis]',
      style: {
        width: 1.2,
        'curve-style': 'straight',
        'line-color': axis,
        'target-arrow-shape': 'none',
        opacity: 0.95,
        'z-index': 0,
        events: 'no',
      },
    },
    {
      selector: 'node.timeline-node',
      style: {
        'font-size': `mapData(pulse, 0, 10, ${scaled(18, fontScale)}, ${scaled(52, fontScale)})`,
        'text-max-width': `${scaled(184, fontScale)}px`,
        'text-margin-y': scaled(7, fontScale),
        'text-outline-width': scaled(3, fontScale),
        'min-zoomed-font-size': 0,
      },
    },
    {
      // truthy boolean data field -> dashed border for draft (uncurated) entities
      selector: 'node[?isDraft]',
      style: {
        'border-width': 2,
        'border-style': 'dashed',
        'border-color': ink,
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
        'border-color': ink,
        'font-weight': 'bold',
        'text-outline-width': 2.5,
        'min-zoomed-font-size': 0,
        'z-index': 9999,
      },
    },
    {
      // A selected news item may point at several nodes. The gold halo echoes
      // the Pulse treatment while keeping single-node selection visually distinct.
      selector: 'node.news-hit',
      style: {
        'border-width': 4,
        'border-color': '#ffd358',
        'font-weight': 'bold',
        'text-outline-width': 3,
        'min-zoomed-font-size': 0,
        'z-index': 9999,
      },
    },
    {
      selector: 'edge.hl',
      style: {
        'line-color': options.darkMode ? '#c8b9d0' : '#5b5d66',
        'target-arrow-color': options.darkMode ? '#c8b9d0' : '#5b5d66',
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
