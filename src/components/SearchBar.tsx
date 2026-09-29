import { useEffect, useMemo, useRef, useState } from 'react'
import type { GraphNodeData, NewsItem } from '../types/entities'
import type { AppMode } from '../types/intelligence'
import { GROUP_META } from '../graph/palette'

interface Props {
  nodes: GraphNodeData[]
  onSelect: (id: string) => void
  mode: AppMode
  news: NewsItem[]
  searchQuery: string
  onSearch: (query: string) => void
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

export default function SearchBar({ nodes, onSelect, mode, news, searchQuery, onSearch }: Props) {
  const [query, setQuery] = useState(searchQuery)
  const [open, setOpen] = useState(false)
  useEffect(() => setQuery(searchQuery), [searchQuery])
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
  const newsMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || mode !== 'news') return []
    return news.filter(item => [item.title, item.summary, item.sourceName, ...item.topicTags].join(' ').toLowerCase().includes(q)).slice(0, 6)
  }, [query, mode, news])

  function choose(id: string) {
    onSelect(id)
    setQuery('')
    setOpen(false)
  }
  function submit() {
    if (mode === 'atlas' && matches[0]) choose(matches[0].node.id)
    else if (query.trim()) { onSearch(query.trim()); setOpen(false) }
  }

  return (
    <div className="search">
      <input
        className="search-input"
        type="search"
        placeholder={mode === 'news' ? 'Search news…' : mode === 'data' ? 'Search data…' : 'Search therapies, trials, materials…'}
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
          if (e.key === 'Enter') { e.preventDefault(); submit() }
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && mode === 'atlas' && matches.length > 0 && (
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
      {open && mode === 'news' && newsMatches.length > 0 && <ul className="search-results">
        {newsMatches.map(item => <li key={item.id}><button type="button" onMouseDown={event => { event.preventDefault(); if (blurTimer.current) window.clearTimeout(blurTimer.current); onSearch(query.trim()); setOpen(false) }}>
          <span className="search-label">{item.title}<small>{item.sourceName} · {item.publishedAt}</small></span><span className="search-group">News</span>
        </button></li>)}
      </ul>}
      {open && mode !== 'atlas' && query.trim() && <button className="search-submit" type="button" onMouseDown={event => { event.preventDefault(); submit() }}>Search {mode === 'news' ? 'news' : 'data'} for “{query.trim()}” ↵</button>}
    </div>
  )
}
