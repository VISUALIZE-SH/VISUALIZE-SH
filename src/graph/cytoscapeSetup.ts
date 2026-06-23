// Configures Cytoscape with the layout extensions once. ES modules are evaluated
// a single time, so the registrations here run exactly once per app load.
import cytoscape from 'cytoscape'
// @ts-expect-error — these extensions ship without bundled type declarations.
import fcose from 'cytoscape-fcose'
// @ts-expect-error — these extensions ship without bundled type declarations.
import dagre from 'cytoscape-dagre'

cytoscape.use(fcose)
cytoscape.use(dagre)

export default cytoscape
