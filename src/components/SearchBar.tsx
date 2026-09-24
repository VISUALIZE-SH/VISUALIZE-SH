import { useMemo, useRef, useState } from 'react'
import type { GraphNodeData } from '../types/entities'
import { GROUP_META } from '../graph/palette'

interface Props {
  nodes: GraphNodeData[]
  onSelect: (id: string) => void
}

function materialMatch(node: GraphNodeData, query: string): string | undefined {
  const entity = node.entity
  if (entity.type !== 'therapy' || entity.therapyType !== 'device') return undefined
  return entity.materials?.find((material) =>
    [material.name, material.role, material.category, material.note]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query),
  )?.name
}

export default function SearchBar({ nodes, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const blurTimer = useRef<number | undefined>(undefined)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return nodes
      .map((node) => ({
        node,
        material: materialMatch(node, q),
      }))
      .filter(({ node, material }) => node.label.toLowerCase().includes(q) || material)
      .slice(0, 8)
  }, [query, nodes])

  function choose(id: string) {
    onSelect(id)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="search">
      <input
        className="search-input"
        type="search"
        placeholder="Search therapies, trials, materials…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so a click on a result registers before the list unmounts.
          blurTimer.current = window.setTimeout(() => setOpen(false), 150)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches[0]) choose(matches[0].node.id)
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && matches.length > 0 && (
        <ul className="search-results">
          {matches.map(({ node, material }) => (
            <li key={node.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (blurTimer.current) window.clearTimeout(blurTimer.current)
                  choose(node.id)
                }}
              >
                <span
                  className="dot"
                  style={{ background: GROUP_META[node.group].color }}
                />
                <span className="search-label">
                  {node.label}
                  {material && <small>Matches {material}</small>}
                </span>
                <span className="search-group">{GROUP_META[node.group].label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
