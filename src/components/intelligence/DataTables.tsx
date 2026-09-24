import { Fragment, useState, type ReactNode } from 'react'
import type { EvidenceClaim, EvidenceMedia, IntelligenceData, ProductVersion, SourceDocument } from '../../types/intelligence'
import type { SpecRow, SpecTable } from '../../data/spec-tables'
import { approvalLabel, compactCitation, thumbnailFor } from '../../data/spec-tables'
import { availabilityLabel, displayValue, formatEvidenceDate, sourceFor, sourceUrl } from '../../data/intelligence'

/** One width scale for every Data table so columns line up down the page. */
export const WIDTH = { product: 232, narrow: 104, cell: 152, wide: 304, sources: 168 } as const

export interface Column<Row> {
  id: string
  label: string
  section?: string
  width: number
  cell: (row: Row, open: (focus: string) => void) => { content: ReactNode; gap?: boolean; title?: string }
}

export interface ProductInfo { name: string; maker: string; thumb?: EvidenceMedia }

function publicAssetPath(path: string): string {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  return `${base}${path.replace(/^\/+/, '')}`
}

export function productInfo(data: IntelligenceData, version: ProductVersion | undefined, fallback = 'Product not resolved'): ProductInfo {
  if (!version) return { name: fallback, maker: '' }
  const maker = data.families.find(family => family.id === version.familyId)?.manufacturer ?? ''
  return { name: version.name, maker, thumb: thumbnailFor(data, version.id) }
}

/** Distinct source documents for a set of source IDs, in first-seen order. */
export function sourcesFor(data: IntelligenceData, ids: Iterable<string>): SourceDocument[] {
  const seen = new Set<string>()
  return [...ids].flatMap(id => {
    if (seen.has(id)) return []
    seen.add(id)
    const source = data.sources.find(item => item.id === id)
    return source ? [source] : []
  })
}

function Citations({ sources }: { sources: SourceDocument[] }) {
  if (!sources.length) return <span className="intel-cite-none">—</span>
  const shown = sources.slice(0, 3)
  return <ul className="intel-cite">
    {shown.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" title={source.title}>{compactCitation(source)}</a></li>)}
    {sources.length > shown.length && <li className="intel-cite-more" title={sources.slice(3).map(compactCitation).join('\n')}>+{sources.length - shown.length} more</li>}
  </ul>
}

function Thumb({ media, name }: { media?: EvidenceMedia; name: string }) {
  return media
    ? <img className="intel-thumb" src={publicAssetPath(media.assetPath)} alt={`${name}: ${media.alt}`} loading="lazy" />
    : <span className="intel-thumb intel-thumb-empty" aria-hidden="true" />
}

/** Category-grouped table with the product in the first column and citations in the last. */
export function GroupedTable<Row>({ id, label, rows, columns, rowKey, product, sources, detail }: {
  id: string
  label: string
  rows: Row[]
  columns: Column<Row>[]
  rowKey: (row: Row) => string
  product: (row: Row) => ProductInfo
  sources: (row: Row) => SourceDocument[]
  detail?: (row: Row, focus: string | null) => ReactNode
}) {
  const [open, setOpen] = useState<{ key: string; focus: string | null } | null>(null)
  const toggle = (key: string, focus: string | null) => setOpen(open?.key === key && open.focus === focus ? null : { key, focus })
  const spans = columns.reduce<Array<{ section: string; span: number }>>((all, column) => {
    const section = column.section ?? ''
    const last = all[all.length - 1]
    if (last?.section === section) last.span += 1
    else all.push({ section, span: 1 })
    return all
  }, [])
  const width = WIDTH.product + WIDTH.sources + columns.reduce((sum, column) => sum + column.width, 0)
  // Placeholders keep names aligned only where some product in this table has a figure.
  const showThumbs = rows.some(row => product(row).thumb)
  return <section className="intel-spec-group" id={`data-${id}`} aria-labelledby={`data-title-${id}`}>
    <h3 id={`data-title-${id}`}>{label} <span>{rows.length}</span></h3>
    <div className="intel-spec-scroll" role="region" aria-label={label} tabIndex={0}>
      <table className="intel-spec-table" style={{ width }}>
        <colgroup><col style={{ width: WIDTH.product }} />{columns.map(column => <col key={column.id} style={{ width: column.width }} />)}<col style={{ width: WIDTH.sources }} /></colgroup>
        <thead>
          {spans.some(span => span.section) && <tr className="intel-spec-sections"><th aria-hidden="true" />{spans.map((span, index) => <th key={`${span.section}-${index}`} colSpan={span.span} scope="colgroup">{span.section}</th>)}<th aria-hidden="true" /></tr>}
          <tr><th scope="col">Product</th>{columns.map(column => <th scope="col" key={column.id}>{column.label}</th>)}<th scope="col">Sources</th></tr>
        </thead>
        <tbody>{rows.map(row => {
          const key = rowKey(row)
          const isOpen = open?.key === key
          const info = product(row)
          const name = <>{showThumbs && <Thumb media={info.thumb} name={info.name} />}<span className="intel-product-text"><span className="intel-spec-name">{info.name}</span>{info.maker && <span className="intel-spec-maker">{info.maker}</span>}</span></>
          return <Fragment key={key}>
            <tr className={isOpen ? 'is-open' : undefined}>
              <th scope="row">{detail
                ? <button type="button" className="intel-product" aria-expanded={isOpen} onClick={() => toggle(key, null)}>{name}</button>
                : <span className="intel-product">{name}</span>}</th>
              {columns.map(column => {
                const { content, gap, title } = column.cell(row, focus => toggle(key, focus))
                return <td key={column.id} className={gap ? 'is-gap' : undefined} title={title}>{content}</td>
              })}
              <td><Citations sources={sources(row)} /></td>
            </tr>
            {isOpen && detail && <tr className="intel-spec-detail"><td colSpan={columns.length + 2}>{detail(row, open?.focus ?? null)}</td></tr>}
          </Fragment>
        })}</tbody>
      </table>
    </div>
  </section>
}

export function JumpNav({ groups }: { groups: Array<{ id: string; label: string; count: number }> }) {
  if (groups.length < 2) return null
  return <nav className="intel-spec-jump" aria-label="Product categories">{groups.map(group => <a key={group.id} href={`#data-${group.id}`}>{group.label}<span>{group.count}</span></a>)}</nav>
}

/* ---------------------------------------------------------------- Specs */

function cellText(claims: EvidenceClaim[]): { text: string; gap: boolean } {
  if (!claims.length) return { text: '—', gap: true }
  const reported = claims.filter(claim => claim.availability === 'reported')
  if (!reported.length) return { text: availabilityLabel(claims[0].availability), gap: true }
  return { text: reported.map(claim => displayValue(claim.value, claim.unit, claim.availability)).join('; '), gap: false }
}

/** Publisher plus every distinct locator; `sourceFor` names only the first. */
function sourceLabel(data: IntelligenceData, claim: EvidenceClaim): string {
  const source = data.sources.find(item => item.id === claim.sourceRefs[0]?.sourceId)
  return `${source ? compactCitation(source) : 'Source'} · ${[...new Set(claim.sourceRefs.map(ref => ref.locator))].join('; ')}`
}

function SpecSheet({ data, row, table, focus, onOpenAtlas }: { data: IntelligenceData; row: SpecRow; table: SpecTable; focus: string | null; onOpenAtlas: (versionId: string) => void }) {
  const items = [
    ...table.columns.flatMap((column, index) => row.cells[index].map(claim => ({ claim, columnId: column.id }))),
    ...row.extra.map(claim => ({ claim, columnId: '' })),
  ]
  const approvalUrl = row.approval ? sourceUrl(data, row.approval.sourceRefs) : undefined
  return <div className="intel-spec-sheet">
    <div className="intel-spec-sheet-head">
      <p>{row.version.summary}</p>
      <button type="button" className="intel-link-button" onClick={() => onOpenAtlas(row.version.id)}>Profile →</button>
    </div>
    {row.approval && <p className="intel-spec-approval"><strong>{row.approval.identifier}</strong> · {formatEvidenceDate(row.approval.date)} · {row.approval.summary}{approvalUrl && <> <a href={approvalUrl} target="_blank" rel="noreferrer">{sourceFor(data, row.approval.sourceRefs)} ↗</a></>}</p>}
    <dl>{items.map(({ claim, columnId }) => {
      const url = sourceUrl(data, claim.sourceRefs)
      return <div key={claim.id} className={focus && focus === columnId ? 'is-focus' : undefined}>
        <dt>{claim.label}{claim.basis === 'analyst_interpretation' && <span> · editorial</span>}</dt>
        <dd>
          <span className="intel-spec-value">{displayValue(claim.value, claim.unit, claim.availability)}</span>
          {claim.context && <small>{claim.context}</small>}
          {claim.limitation && <small className="intel-boundary">{claim.limitation}</small>}
          <small>{url ? <a href={url} target="_blank" rel="noreferrer">{sourceLabel(data, claim)} ↗</a> : sourceLabel(data, claim)}{claim.reviewStatus === 'draft' && ' · draft'}</small>
        </dd>
      </div>
    })}</dl>
    {row.media.length > 0 && <div className="intel-spec-figures">{row.media.map(item => <figure key={item.id}>
      <a href={publicAssetPath(item.assetPath)} target="_blank" rel="noreferrer"><img src={publicAssetPath(item.assetPath)} alt={item.alt} loading="lazy" /></a>
      <figcaption>{item.title}{item.page ? ` · p.${item.page}` : ''}</figcaption>
    </figure>)}</div>}
  </div>
}

export function SpecTables({ data, tables, onOpenAtlas }: { data: IntelligenceData; tables: SpecTable[]; onOpenAtlas: (versionId: string) => void }) {
  return <div className="intel-spec-tables">
    <JumpNav groups={tables.map(table => ({ id: table.id, label: table.label, count: table.rows.length }))} />
    {tables.map(table => {
      const columns: Column<SpecRow>[] = [
        {
          id: 'us-approval', label: 'US approval', width: WIDTH.narrow,
          cell: row => ({
            gap: !row.approval,
            title: row.approval ? `${row.approval.identifier} · ${formatEvidenceDate(row.approval.date)} · ${row.approval.changeType.replace(/_/g, ' ')}` : 'No US decision recorded',
            content: <>{approvalLabel(row.approval) || '—'}{row.approval?.changeType === 'indication' && <small>indication</small>}</>,
          }),
        },
        ...table.columns.map((column, index): Column<SpecRow> => ({
          id: column.id, label: column.label, section: column.section, width: WIDTH.cell,
          cell: (row, open) => {
            const claims = row.cells[index]
            const { text, gap } = cellText(claims)
            const title = claims.map(claim => `${displayValue(claim.value, claim.unit, claim.availability)}\n${sourceLabel(data, claim)}${claim.reviewStatus === 'draft' ? ' · draft' : ''}`).join('\n\n') || 'Not curated yet'
            return { gap, title, content: claims.length ? <button type="button" className="intel-cell-button" onClick={() => open(column.id)}>{text}</button> : text }
          },
        })),
      ]
      return <GroupedTable<SpecRow> key={table.id} id={table.id} label={table.label} rows={table.rows} columns={columns}
        rowKey={row => row.version.id}
        product={row => ({ name: row.version.name, maker: row.manufacturer, thumb: thumbnailFor(data, row.version.id) })}
        sources={row => sourcesFor(data, [...row.cells.flat(), ...row.extra].flatMap(claim => claim.sourceRefs.map(ref => ref.sourceId)).concat(row.approval?.sourceRefs.map(ref => ref.sourceId) ?? []))}
        detail={(row, focus) => <SpecSheet data={data} row={row} table={table} focus={focus} onOpenAtlas={onOpenAtlas} />} />
    })}
  </div>
}
