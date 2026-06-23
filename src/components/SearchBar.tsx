import { useMemo, useRef, useState } from 'react'
import type { GraphNodeData } from '../types/entities'
import { GROUP_META } from '../graph/palette'

interface Props {
  nodes: GraphNodeData[]
  onSelect: (id: string) => void
}

export default function SearchBar({ nodes, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const blurTimer = useRef<number | undefined>(undefined)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return nodes
      .filter((n) => n.label.toLowerCase().includes(q))
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
        placeholder="Search conditions, therapies, trials…"
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
          if (e.key === 'Enter' && matches[0]) choose(matches[0].id)
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && matches.length > 0 && (
        <ul className="search-results">
          {matches.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (blurTimer.current) window.clearTimeout(blurTimer.current)
                  choose(n.id)
                }}
              >
                <span
                  className="dot"
                  style={{ background: GROUP_META[n.group].color }}
                />
                <span className="search-label">{n.label}</span>
                <span className="search-group">{GROUP_META[n.group].label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
