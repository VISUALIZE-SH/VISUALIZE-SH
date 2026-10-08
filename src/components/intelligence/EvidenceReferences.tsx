import { useId, useMemo } from 'react'
import type { IntelligenceData } from '../../types/intelligence'
import { formatApaReference, REFERENCE_CATEGORIES, referencesFor, referencesToApaHtml } from '../../data/references'
import './references.css'

interface Props {
  data: IntelligenceData
  versionId?: string
  entityId?: string
  name: string
  compact?: boolean
}

export default function EvidenceReferences({ data, versionId, entityId, name, compact = false }: Props) {
  const headingId = useId()
  const references = useMemo(() => referencesFor(data, { versionId, entityId }), [data, versionId, entityId])
  const groups = REFERENCE_CATEGORIES.map(category => ({ category, items: references.filter(item => item.category === category) }))
    .filter(group => group.items.length || group.category === 'Patents')
  function exportReferences() {
    const href = URL.createObjectURL(new Blob([referencesToApaHtml(references, name)], { type: 'text/html;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'therapy'}-references-apa.html`
    anchor.style.display = 'none'
    document.body.append(anchor)
    anchor.click()
    window.setTimeout(() => { URL.revokeObjectURL(href); anchor.remove() }, 1_000)
  }
  const content = <>
    {!compact && <p className="evidence-references-intro">All recorded sources for this {versionId ? 'version and its related therapy' : 'therapy'}, grouped in one place.</p>}
    {groups.map(({ category, items }) => <section className="evidence-reference-group" key={category} aria-label={category}>
      <h4>{category} <span>{items.length}</span></h4>
      {items.length ? <ul>{items.map(({ source, locators, contexts, connections }) => <li key={source.id}>
        <a className="evidence-reference-title" href={source.url} target="_blank" rel="noreferrer" title={formatApaReference(source)}>{source.title} <span aria-hidden="true">↗</span></a>
        <p className="evidence-reference-meta">{source.publisher}{source.publishedAt && ` · ${source.publishedAt.value}`}{source.identifier && ` · ${source.identifier}`}</p>
        {connections.map(connection => <p className="evidence-patent-connection" key={`${connection.source.id}:${connection.statement}`}>{connection.statement} <a href={connection.source.url} target="_blank" rel="noreferrer">Product connection · {connection.locator} ↗</a></p>)}
        <details className="evidence-reference-locators"><summary>Referenced in {contexts.join(' · ')}</summary><ul>{locators.map(locator => <li key={locator}>{locator}</li>)}</ul></details>
      </li>)}</ul> : <p className="evidence-reference-empty">No directly linked patent reference recorded.</p>}
    </section>)}
    {!references.length && <p className="evidence-reference-empty">No sources recorded for this therapy yet.</p>}
  </>
  return <section className={`evidence-references${compact ? ' evidence-references-compact' : ''}`} aria-labelledby={headingId}>
    <header className="evidence-references-head"><h3 id={headingId}>Evidence <span>{references.length}</span></h3><button type="button" className="evidence-references-export" disabled={!references.length} onClick={exportReferences} title="Download all sources as an APA reference list with italics and hanging indents">Export References</button></header>
    {compact ? <details className="evidence-reference-expand"><summary>View grouped references</summary>{content}</details> : content}
  </section>
}
