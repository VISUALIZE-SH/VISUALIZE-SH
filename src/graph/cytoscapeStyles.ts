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
  stableIslands?: boolean
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
      // Halted trials and retired/recalled therapies remain visible, with a
      // clear red outline that is distinct from ordinary draft styling.
      selector: 'node[?isHalted], node[?isRetired]',
      style: {
        'border-width': 4,
        'border-style': 'solid',
        'border-color': '#d92d20',
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
      // Selection emphasis keeps the lifecycle alert visible on top of its
      // default border styling while preserving the selected label treatment.
      selector: 'node.sel[?isHalted], node.sel[?isRetired]',
      style: {
        'border-width': 4,
        'border-color': '#d92d20',
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

  if (options.stableIslands) styles.push(
    // Inherit the shared pulse-to-font-size mapping for every group.
    { selector: 'node[islandLabel]', style: { label: 'data(islandLabel)', 'text-max-width': 175, 'min-zoomed-font-size': 5, 'text-outline-width': 2, width: 'mapData(degree, 0, 15, 28, 52)', height: 'mapData(degree, 0, 15, 28, 52)' } },
    { selector: 'node[group = "condition"]', style: { width: 72, height: 72, 'text-max-width': 280, 'font-weight': 700, 'text-valign': 'center', 'text-halign': 'center', color: options.darkMode ? '#ead8f5' : '#48135f', 'background-color': options.darkMode ? '#33213e' : '#ead9f2', 'border-width': 2, 'min-zoomed-font-size': 0, 'z-index': 300 } },
    { selector: 'node[group = "company"]', style: { 'text-max-width': 150, width: 27, height: 23 } },
    { selector: 'node[group = "trial"]', style: { 'text-max-width': 155, width: 28, height: 28 } },
    { selector: 'node[?isSharedTarget]', style: { 'font-weight': 600, 'text-max-width': 240, 'z-index': 200 } },
    { selector: 'edge', style: { opacity: 0.32, width: 1.3, 'arrow-scale': 0.6 } },
    { selector: 'edge[relationship = "treats"], edge[relationship = "investigated_for"]', style: { 'line-color': options.darkMode ? '#b987d1' : '#9859b5', 'target-arrow-color': options.darkMode ? '#b987d1' : '#9859b5', opacity: 0.55, width: 1.7 } },
    { selector: 'edge[relationship = "used_in"]', style: { 'line-color': '#3a9294', 'target-arrow-color': '#3a9294', opacity: 0.55 } },
    { selector: 'edge[relationship = "invested_in"], edge[relationship = "acquired"], edge[relationship = "option_to_acquire"], edge[relationship = "portfolio_includes"], edge[relationship = "terminated_acquisition"]', style: { 'line-color': '#b68a37', 'target-arrow-color': '#b68a37', 'line-style': 'dotted', opacity: 0.65, width: 2 } },
    { selector: '.faded', style: { opacity: 0.08, 'text-opacity': 0 } },
    { selector: 'node.sel', style: { 'z-index': 9999, 'min-zoomed-font-size': 0, 'font-weight': 700 } },
    { selector: 'edge.hl', style: { opacity: 1, width: 2.7 } },
  )

  // Evidence state and relationship meaning apply in every layout, including Timeline.
  styles.push(
    { selector: 'edge[?isDraft]', style: { 'line-style': 'dashed' } },
    { selector: 'edge[relationship = "investigated_for"], edge[relationship = "option_to_acquire"], edge[relationship = "terminated_acquisition"]', style: { 'line-style': 'dotted' } },
  )

  return styles
}
