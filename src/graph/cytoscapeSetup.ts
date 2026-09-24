// Configure the condition-clustered Atlas layout once per app load.
import cytoscape from 'cytoscape'
// @ts-expect-error — these extensions ship without bundled type declarations.
import fcose from 'cytoscape-fcose'

cytoscape.use(fcose)

export default cytoscape
