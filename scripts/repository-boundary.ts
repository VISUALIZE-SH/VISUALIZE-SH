/** Conservative path checks; filenames cannot establish content or owner approval. */
const privateRoots = new Set([
  'discovery-engine', 'runs', 'signals', 'watchlists', 'snapshots', 'vault',
  'candidates', 'crosswalk', 'exports',
])

const privateDocumentName = /(?:^|[-_])(?:research|screening|source[-_]discovery|lead[-_]discovery|source[-_]leads?|review[-_]outcomes?)(?:[-_.]|$)/
const privateDocumentDirectory = /^(?:research|screening|source-discovery|lead-discovery|source-leads|review-outcomes)$/

/** Returns the boundary violation, if this is an obviously private artifact path. */
export function repositoryBoundaryViolation(file: string): string | undefined {
  const path = file.replaceAll('\\', '/').replace(/^(?:\.\/)+/, '').toLowerCase()
  const parts = path.split('/')
  if (privateRoots.has(parts[0])) return 'private research/discovery root'

  if (parts[0] === 'docs') {
    const name = parts.at(-1) ?? ''
    if (parts.slice(1, -1).some(part => privateDocumentDirectory.test(part.replaceAll('_', '-')))
      || privateDocumentName.test(name)) return 'private research/screening or discovery review document'
    if (/^collection_approval_.*\.md$/.test(name)
      || /^siegel_rhenium_review_\d{4}-\d{2}-\d{2}\.md$/.test(name)
      || /^docs\/data-updates\/\d{4}-\d{2}-\d{2}-lsi-intake\.md$/.test(path)) {
      return 'private intake approval or review receipt'
    }
  }

  if (parts[0] === 'prompts'
    && (privateDocumentName.test(parts.at(-1) ?? '')
      || parts.slice(1, -1).some(part => privateDocumentDirectory.test(part.replaceAll('_', '-'))))) {
    return 'private research or source/lead discovery prompt'
  }

  // Only explicit discovery/LSI screen captures: approved documentary figures,
  // artwork and general UI screenshots do not belong to this path denylist.
  if (/\.(?:png|jpe?g|webp|gif|avif|pdf)$/.test(path)
    && /(?:^|[/_-])(?:discovery|lsi)[-_](?:screens?|screenshots?|captures?)(?:[/_.-]|$)|(?:^|[/_-])(?:screenshots?|captures?)[-_](?:discovery|lsi)(?:[/_.-]|$)/.test(path)) {
    return 'private discovery/LSI screen capture'
  }
  return undefined
}
