import type {
  ComparisonCategory,
  EvidenceClaim,
  EvidenceMedia,
  IntelligenceData,
  ProductVersion,
  RegulatoryDecision,
  SourceDocument,
} from '../types/intelligence'
import { dateValue, isOnOrBefore } from './intelligence'

/** A table column: a standard attribute, or a claim key for uncategorized versions. */
export interface SpecColumn { id: string; label: string; section: string }
export interface SpecRow {
  version: ProductVersion
  manufacturer: string
  approval?: RegulatoryDecision
  /** Claims aligned with the table columns; an empty cell is a curation gap. */
  cells: EvidenceClaim[][]
  /** Version claims that are not table columns, shown in the row's detail. */
  extra: EvidenceClaim[]
  media: EvidenceMedia[]
}
export interface SpecTable { id: string; label: string; category?: ComparisonCategory; columns: SpecColumn[]; rows: SpecRow[] }

const IDENTITY = new Set(['manufacturer', 'family', 'exact-version'])

/** Earliest authorization recorded for a version in scope; later supplements stay in History. */
export function firstDecision(data: IntelligenceData, versionId: string, jurisdiction = '', asOf = ''): RegulatoryDecision | undefined {
  return data.decisions
    .filter(decision => decision.versionIds.includes(versionId) && (!jurisdiction || decision.jurisdiction === jurisdiction) && isOnOrBefore(decision.date, asOf))
    .sort((left, right) => dateValue(left.date).localeCompare(dateValue(right.date)))[0]
}

export function approvalLabel(decision: RegulatoryDecision | undefined): string {
  return decision ? `${decision.pathway} · ${dateValue(decision.date).slice(0, 4)}` : ''
}

export interface Placement { id: string; label: string; order: number }

/** Uncategorized products share one group; name it for what it holds. */
function otherLabel(versions: ProductVersion[]): string {
  return versions.length && versions.every(version => version.kind === 'digital') ? 'Digital tools' : 'Other products'
}

/** Each version's display group: its first comparison category in display order. */
export function versionPlacement(data: IntelligenceData): (versionId: string) => Placement {
  const placed = new Map<string, Placement>()
  const categories = [...(data.comparisonCategories ?? [])]
    .sort((left, right) => (left.order ?? 999) - (right.order ?? 999) || left.label.localeCompare(right.label))
  categories.forEach((category, index) => {
    for (const id of category.versionIds) if (!placed.has(id)) placed.set(id, { id: category.id, label: category.label, order: index })
  })
  const other: Placement = { id: 'other', label: otherLabel(data.versions.filter(version => !placed.has(version.id))), order: 10_000 }
  return (versionId: string) => placed.get(versionId) ?? other
}

/** Device figure for the product column; text-page excerpts (function/workflow) are not thumbnails. */
export function thumbnailFor(data: IntelligenceData, versionId: string): EvidenceMedia | undefined {
  const media = (data.media ?? []).filter(item => item.versionIds.includes(versionId))
  return media.find(item => item.panel === 'design') ?? media.find(item => item.panel === 'action')
}

/** FDA document numbers recoverable from database or PDF URLs (P140031S085D.pdf, ?id=K214066). */
function fdaNumber(url: string): string {
  const match = url.match(/(?:id=|\/)((?:P|H|K|DEN)\d{6})(S\d{3})?(?:[A-Z]?\.pdf|$|&)/i)
  return match ? `${match[1].toUpperCase()}${match[2] ? `/${match[2].toUpperCase()}` : ''}` : ''
}

/** Short citation such as "FDA P140031/S085" or "Medtronic 2024". */
export function compactCitation(source: SourceDocument): string {
  const publisher = source.publisher.split(/\s*[,(;/]\s*/)[0]
  const year = source.publishedAt ? dateValue(source.publishedAt).slice(0, 4) : ''
  // Long DOIs/PMCIDs belong in the link target, not the table cell.
  const identifier = source.identifier && source.identifier.length <= 20 && !/^(doi|pmc|pmid)/i.test(source.identifier) ? source.identifier : ''
  const detail = identifier || fdaNumber(source.url) || year
  const citation = `${publisher}${detail ? ` ${detail}` : ''}`
  return citation.length > 36 ? `${citation.slice(0, 35)}…` : citation
}

function matches(row: SpecRow, table: { label: string }, query: string): boolean {
  if (!query) return true
  const haystack = [table.label, row.version.name, row.version.model, row.manufacturer, row.approval?.identifier,
    ...row.cells.flat().map(claim => String(claim.value ?? '')), ...row.extra.map(claim => `${claim.label} ${claim.value ?? ''}`)]
  return haystack.join(' ').toLowerCase().includes(query)
}

/**
 * Group product versions into one spec table per comparison category. Each
 * version appears once, under its first category in display order; versions
 * without a category share a table whose columns are their own claim labels.
 */
export function projectSpecTables(
  data: IntelligenceData,
  options: { versionId?: string | null; asOf?: string; jurisdiction?: string; query?: string } = {},
): SpecTable[] {
  const { versionId, asOf = '', jurisdiction = '', query = '' } = options
  const needle = query.trim().toLowerCase()
  const families = new Map(data.families.map(family => [family.id, family]))
  const versions = data.versions.filter(version => !versionId || version.id === versionId)
  const claims = data.claims.filter(claim => isOnOrBefore(claim.observedAt, asOf) && !IDENTITY.has(claim.comparisonAttributeId ?? ''))
  const claimsFor = (id: string) => claims.filter(claim => claim.versionId === id)
  const categories = [...(data.comparisonCategories ?? [])]
    .sort((left, right) => (left.order ?? 999) - (right.order ?? 999) || left.label.localeCompare(right.label))
  const placed = new Set<string>()

  const row = (version: ProductVersion, columns: SpecColumn[], cellFor: (claim: EvidenceClaim, column: SpecColumn) => boolean): SpecRow => {
    const own = claimsFor(version.id)
    const cells = columns.map(column => own.filter(claim => cellFor(claim, column)))
    const shown = new Set(cells.flat().map(claim => claim.id))
    return {
      version,
      manufacturer: families.get(version.familyId)?.manufacturer ?? '',
      approval: firstDecision(data, version.id, jurisdiction, asOf),
      cells,
      extra: own.filter(claim => !shown.has(claim.id)),
      media: (data.media ?? []).filter(item => item.versionIds.includes(version.id)),
    }
  }

  const tables: SpecTable[] = categories.flatMap(category => {
    const members = versions.filter(version => category.versionIds.includes(version.id) && !placed.has(version.id))
    members.forEach(version => placed.add(version.id))
    if (!members.length) return []
    const attributes = (data.standardAttributes ?? [])
      .filter(attribute => attribute.categoryIds.includes(category.id) && attribute.scope === 'version_wide' && !IDENTITY.has(attribute.id))
      .sort((left, right) => left.order - right.order)
      .map(({ id, label, section }) => ({ id, label, section }))
    const allRows = members.map(version => row(version, attributes, (claim, column) => claim.comparisonAttributeId === column.id))
    // A column nobody has curated yet adds width without information.
    const used = attributes.map((_, index) => allRows.some(item => item.cells[index].length > 0))
    const columns = attributes.filter((_, index) => used[index])
    const rows = allRows
      .map(item => ({ ...item, cells: item.cells.filter((_, index) => used[index]) }))
      .filter(item => matches(item, category, needle))
    return rows.length ? [{ id: category.id, label: category.label, category, columns, rows }] : []
  })

  const others = versions.filter(version => !placed.has(version.id))
  if (others.length) {
    // Only keys shared by several products become columns; one-off claims stay in the row detail.
    const seen = new Map<string, { column: SpecColumn; versions: Set<string> }>()
    for (const claim of others.flatMap(version => claimsFor(version.id))) {
      if (claim.basis === 'analyst_interpretation' || claim.category === 'evidence' || claim.category === 'evolution') continue
      const entry = seen.get(claim.key) ?? { column: { id: claim.key, label: claim.label, section: 'Details' }, versions: new Set<string>() }
      entry.versions.add(claim.versionId)
      seen.set(claim.key, entry)
    }
    const columns = [...seen.values()].filter(entry => others.length < 2 || entry.versions.size > 1).map(entry => entry.column)
    const rows = others
      .map(version => row(version, columns, (claim, column) => claim.key === column.id && claim.basis !== 'analyst_interpretation' && claim.category !== 'evidence'))
      .filter(item => matches(item, { label: 'Other' }, needle))
    if (rows.length) tables.push({ id: 'other', label: otherLabel(others), columns, rows })
  }
  return tables
}
