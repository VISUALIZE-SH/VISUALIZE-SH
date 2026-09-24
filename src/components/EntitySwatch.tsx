import type { NodeGroup } from '../types/entities'
import { GROUP_META } from '../graph/palette'

/** Match the shape and color used for each entity type in the Atlas graph. */
export default function EntitySwatch({ group }: { group: NodeGroup }) {
  const { color, shape } = GROUP_META[group]
  const fill = { fill: color, stroke: 'rgba(0, 0, 0, 0.12)', strokeWidth: 0.7 }

  return (
    <svg className="entity-swatch" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      {shape === 'ellipse' && <circle cx="9" cy="9" r="7.5" {...fill} />}
      {shape === 'hexagon' && <polygon points="5,1.5 13,1.5 17,9 13,16.5 5,16.5 1,9" {...fill} />}
      {shape === 'round-rectangle' && <rect x="1.5" y="3" width="15" height="12" rx="4" {...fill} />}
      {shape === 'round-triangle' && <path d="M7.2 2.6 Q9 0 10.8 2.6 L16.5 12.6 Q18 15.5 14.8 15.5 H3.2 Q0 15.5 1.5 12.6 Z" {...fill} />}
      {shape === 'diamond' && <polygon points="9,1 17,9 9,17 1,9" {...fill} />}
      {shape === 'star' && <polygon points="9,1 11.1,6.1 16.6,6.5 12.4,10.1 13.7,15.8 9,12.8 4.3,15.8 5.6,10.1 1.4,6.5 6.9,6.1" {...fill} />}
      {shape === 'rectangle' && <rect x="2" y="2" width="14" height="14" {...fill} />}
    </svg>
  )
}
