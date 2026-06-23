// Configures Cytoscape with its layout extensions. ES modules are evaluated a
// single time, so the registration here runs exactly once per app load.
//
// fcose (the default "Clustered" layout) is registered eagerly because it's
// needed for the first paint. dagre powers only the non-default "Hierarchy"
// layout and pulls in a sizeable dependency tree, so it is **code-split**: it is
// dynamically imported and registered the first time a dagre layout is actually
// requested (see ensureLayoutExtension), keeping it out of the initial bundle.
import cytoscape from 'cytoscape'
// @ts-expect-error — these extensions ship without bundled type declarations.
import fcose from 'cytoscape-fcose'

cytoscape.use(fcose)

let dagreReady: Promise<void> | null = null

/**
 * Ensure the Cytoscape extension a layout needs is registered before it runs.
 * Only dagre is lazy; everything else resolves immediately. Idempotent — the
 * dynamic import/registration happens at most once.
 */
export function ensureLayoutExtension(name: string): Promise<void> {
  if (name !== 'dagre') return Promise.resolve()
  if (!dagreReady) {
    // @ts-expect-error — cytoscape-dagre ships without bundled type declarations.
    dagreReady = import('cytoscape-dagre').then((mod) => cytoscape.use(mod.default))
  }
  return dagreReady
}

export default cytoscape
