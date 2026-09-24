import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { EvidenceMedia, IntelligenceData, LineageEdge } from '../../types/intelligence'
import {
  formatEvidenceDate,
  isOnOrBefore,
  lineageVisibleAsOf,
  lineageRelationshipLabel,
  outcomeRows,
  mediaForVersion,
  rowsToCsv,
  sourceFor,
  sourceProvenance,
  sourceUrl,
  sourceUrls,
  versionById,
  versionName,
} from '../../data/intelligence'
import { projectSpecTables, versionPlacement, type Placement } from '../../data/spec-tables'
import ComparisonView from './ComparisonView'
import { GroupedTable, JumpNav, SpecTables, WIDTH, productInfo, sourcesFor } from './DataTables'
import './intelligence.css'

type DataTab = 'specs' | 'outcomes' | 'history' | 'figures'
type OutcomeRow = ReturnType<typeof outcomeRows>[number]

export interface DataWorkspaceProps {
  data: IntelligenceData
  conditionId: string
  versionId: string | null
  onOpenAtlas: (versionId: string) => void
  jurisdiction: string
  asOf: string
  dataView: 'browse' | 'compare'
  compareCategory: string
  compareVersionIds: string[]
  compareConfigurationIds: string[]
  onDataViewChange: (view: 'browse' | 'compare') => void
  onCompareCategoryChange: (categoryId: string) => void
  onCompareVersionIdsChange: (versionIds: string[]) => void
  onCompareConfigurationIdsChange: (configurationIds: string[]) => void
}

interface HistoryRow {
  id: string
  recordType: 'lineage' | 'regulatory'
  versionIds: string[]
  record: string
  change: string
  products: string
  explanation: string
  date?: string
  jurisdiction?: string
  source: string
  sourceUrl?: string
  sourceUrls: string
  sourceIds: string
  sourceLocators: string
  reviewStatus: string
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  window.setTimeout(() => {
    URL.revokeObjectURL(href)
    anchor.remove()
  }, 1_000)
}

function matchesQuery(row: object, query: string): boolean {
  if (!query) return true
  return Object.values(row).filter((value) => typeof value !== 'object').join(' ').toLowerCase().includes(query)
}

interface Grouped<Row> { id: string; label: string; order: number; rows: Row[] }

/** Place rows under the same category groups, in the same order, as the Specs tab. */
function groupRows<Row>(rows: Row[], versionOf: (row: Row) => string | undefined, place: (versionId: string) => Placement): Grouped<Row>[] {
  const groups = new Map<string, Grouped<Row>>()
  for (const row of rows) {
    const placement = place(versionOf(row) ?? '')
    const group = groups.get(placement.id) ?? { ...placement, rows: [] }
    group.rows.push(row)
    groups.set(placement.id, group)
  }
  return [...groups.values()].sort((left, right) => left.order - right.order)
}

function OutcomeDetail({ row }: { row: OutcomeRow }) {
  return <div className="intel-spec-sheet"><dl>
    <div><dt>Interpretation</dt><dd>{row.interpretation}{row.limitation && <small className="intel-boundary">{row.limitation}</small>}</dd></div>
    <div><dt>Population</dt><dd>{row.cohortPopulation}<small>Enrollment {row.enrollment} · analysis {row.endpointAnalysisPopulation} · {row.endpointMeasureType}</small></dd></div>
    <div><dt>Product scope</dt><dd>{row.versionContext}{row.nctId && <small>{row.nctId}</small>}</dd></div>
    <div><dt>Statistics</dt><dd>{row.ci}{row.pValue !== undefined && <small>p {row.pValueQualifier ?? '='} {row.pValue}</small>}<small>{formatEvidenceDate(row.observedAt)}{row.reviewStatus === 'draft' && ' · draft'}</small></dd></div>
  </dl></div>
}

const splitIds = (value: string) => value.split('; ').filter(Boolean)

type HistoryItem = HistoryRow & { versionId: string }
interface FigureItem { media: EvidenceMedia; versionId: string }

function assetUrl(path: string): string {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  return `${base}${path.replace(/^\/+/, '')}`
}

function GroupedTabs<Row>({ groups, render }: { groups: Grouped<Row>[]; render: (group: Grouped<Row>) => ReactNode }) {
  return <div className="intel-spec-tables"><JumpNav groups={groups.map(group => ({ id: group.id, label: group.label, count: group.rows.length }))} />{groups.map(render)}</div>
}

export default function DataWorkspace({
  data, conditionId, versionId, onOpenAtlas, jurisdiction, asOf, dataView, compareCategory, compareVersionIds, compareConfigurationIds,
  onDataViewChange, onCompareCategoryChange, onCompareVersionIdsChange, onCompareConfigurationIdsChange,
}: DataWorkspaceProps) {
  const [tab, setTab] = useState<DataTab>('specs')
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()

  const specTables = useMemo(() => projectSpecTables(data, { versionId, asOf, jurisdiction, query: normalizedQuery }), [data, versionId, asOf, jurisdiction, normalizedQuery])
  const outcomeRowsAll = useMemo(() => outcomeRows(data, versionId, asOf), [data, versionId, asOf])
  const mediaRows = useMemo<EvidenceMedia[]>(() => mediaForVersion(data, versionId), [data, versionId])

  const historyRows = useMemo<HistoryRow[]>(() => {
    const decisions = data.decisions
      .filter((decision) => (!versionId || decision.versionIds.includes(versionId)) && (!jurisdiction || decision.jurisdiction === jurisdiction) && isOnOrBefore(decision.date, asOf))
      .map((decision) => ({
        id: decision.id, versionIds: decision.versionIds, recordType: 'regulatory' as const, record: `${decision.identifier} · ${decision.pathway}`,
        change: decision.changeType.replace(/_/g, ' '), products: decision.versionIds.map((id) => versionName(data, id)).join('; ') || '—', explanation: decision.summary,
        date: decision.date.value, jurisdiction: decision.jurisdiction, source: sourceFor(data, decision.sourceRefs), sourceUrl: sourceUrl(data, decision.sourceRefs), sourceUrls: sourceUrls(data, decision.sourceRefs), sourceIds: sourceProvenance(decision.sourceRefs).sourceIds, sourceLocators: sourceProvenance(decision.sourceRefs).locators, reviewStatus: decision.reviewStatus,
      }))
      .sort((left, right) => right.date.localeCompare(left.date))
    const edges = data.lineage
      .filter((edge: LineageEdge) => !versionId || edge.fromVersionId === versionId || edge.toVersionId === versionId)
      .filter((edge) => lineageVisibleAsOf(data, edge, asOf))
      .map((edge) => ({
        id: edge.id, versionIds: [edge.fromVersionId, edge.toVersionId], recordType: 'lineage' as const, record: versionName(data, edge.fromVersionId),
        change: lineageRelationshipLabel(edge.relationship), products: versionName(data, edge.toVersionId), explanation: edge.explanation,
        source: sourceFor(data, edge.sourceRefs), sourceUrl: sourceUrl(data, edge.sourceRefs), sourceUrls: sourceUrls(data, edge.sourceRefs), sourceIds: sourceProvenance(edge.sourceRefs).sourceIds, sourceLocators: sourceProvenance(edge.sourceRefs).locators, reviewStatus: edge.reviewStatus,
      }))
    return [...decisions, ...edges]
  }, [data, versionId, jurisdiction, asOf])

  const filteredOutcomes = useMemo(() => outcomeRowsAll.filter((row) => matchesQuery(row, normalizedQuery)), [outcomeRowsAll, normalizedQuery])
  const filteredHistory = useMemo(() => historyRows.filter((row) => matchesQuery(row, normalizedQuery)), [historyRows, normalizedQuery])
  const filteredMedia = useMemo(() => mediaRows.filter((media) => matchesQuery({
    title: media.title, caption: media.caption, panel: media.panel, locator: media.sourceRefs.map((ref) => ref.locator).join(' '),
    versions: media.versionIds.map((id) => versionName(data, id)).join(' '),
  }, normalizedQuery)), [mediaRows, data, normalizedQuery])

  const place = useMemo(() => versionPlacement(data), [data])
  // Outcomes are attributed to a product family unless a readout names the exact version.
  const outcomeFamily = (row: OutcomeRow) => data.families.find(family => data.trials.find(trial => trial.id === row.trialId)?.familyIds?.includes(family.id))
  const outcomeVersion = (row: OutcomeRow) => row.versionIds[0] ?? data.versions.find(version => version.familyId === outcomeFamily(row)?.id)?.id
  const outcomeProduct = (row: OutcomeRow) => {
    if (row.versionIds.length) return productInfo(data, versionById(data, row.versionIds[0]))
    const family = outcomeFamily(row)
    return { name: family ? `${family.name} family` : row.trial, maker: family ? `${family.manufacturer} · generation unresolved` : 'Product not resolved' }
  }
  const outcomeGroups = useMemo(() => groupRows(filteredOutcomes, outcomeVersion, place), [filteredOutcomes, place])
  const historyGroups = useMemo(() => groupRows(filteredHistory.flatMap(row => (row.versionIds.length ? row.versionIds : ['']).map(versionId => ({ ...row, versionId }))), row => row.versionId, place), [filteredHistory, place])
  const figureGroups = useMemo(() => groupRows(filteredMedia.flatMap(media => media.versionIds.map(versionId => ({ media, versionId }))), row => row.versionId, place), [filteredMedia, place])
  const specCount = specTables.reduce((sum, table) => sum + table.rows.length, 0)
  const tabs: Array<{ id: DataTab; label: string; count: number }> = [
    { id: 'specs', label: 'Specs', count: specCount },
    { id: 'outcomes', label: 'Outcomes', count: filteredOutcomes.length },
    { id: 'history', label: 'History', count: filteredHistory.length },
    { id: 'figures', label: 'Figures', count: filteredMedia.length },
  ]
  const available = tabs.filter(({ id, count }) => id === 'specs' || count > 0)
  const activeTab = available.some(({ id }) => id === tab) ? tab : 'specs'
  useEffect(() => { if (activeTab !== tab) setTab(activeTab) }, [activeTab, tab])
  const activeCount = tabs.find(({ id }) => id === activeTab)?.count ?? 0
  const hasDraft = activeTab === 'specs' && specTables.some(table => table.rows.some(row => [...row.cells.flat(), ...row.extra].some(claim => claim.reviewStatus === 'draft')))

  function exportRows(format: 'csv' | 'json') {
    const context = { datasetVersion: data.schemaVersion, datasetUpdatedAt: data.updatedAt, asOf, jurisdiction }
    const rows: Record<string, unknown>[] = activeTab === 'specs'
      ? specTables.flatMap(table => table.rows.flatMap(row => [...table.columns.flatMap((column, index) => row.cells[index].map(claim => ({ claim, attribute: column.label }))), ...row.extra.map(claim => ({ claim, attribute: claim.label }))].map(({ claim, attribute }) => ({
        ...context, table: table.label, versionId: row.version.id, version: row.version.name, manufacturer: row.manufacturer,
        usApproval: row.approval ? `${row.approval.identifier} ${row.approval.date.value}` : '', attribute, attributeId: claim.comparisonAttributeId ?? claim.key,
        value: claim.value ?? '', unit: claim.unit ?? '', availability: claim.availability, basis: claim.basis, context: claim.context ?? '', limitation: claim.limitation ?? '',
        observedAt: claim.observedAt, sourceIds: sourceProvenance(claim.sourceRefs).sourceIds, sourceLocators: sourceProvenance(claim.sourceRefs).locators, sourceUrls: sourceUrls(data, claim.sourceRefs), reviewStatus: claim.reviewStatus,
      }))))
      : activeTab === 'outcomes' ? filteredOutcomes.map(row => ({ ...context, ...row }))
        : activeTab === 'history' ? filteredHistory.map(row => ({ ...context, ...row, versionIds: row.versionIds.join('; ') }))
          : filteredMedia.map(media => ({
            ...context, id: media.id, versionIds: media.versionIds.join('; '), panel: media.panel, title: media.title, caption: media.caption,
            alt: media.alt, assetPath: media.assetPath, page: media.page, figure: media.figure,
            sourceIds: sourceProvenance(media.sourceRefs).sourceIds, sourceLocators: sourceProvenance(media.sourceRefs).locators, reviewStatus: media.reviewStatus,
          }))
    const filename = `visualize-sh-${activeTab}-${asOf || 'all'}.${format}`
    download(filename, format === 'csv' ? rowsToCsv(rows) : JSON.stringify(rows, null, 2), format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json')
  }

  return <section className="intel-workspace intel-data" aria-labelledby="data-title">
    <header className="intel-data-head">
      <h2 id="data-title">Data</h2>
      <div className="intel-data-view-switch" role="group" aria-label="Data view"><button type="button" aria-pressed={dataView === 'browse'} className={dataView === 'browse' ? 'is-active' : ''} onClick={() => onDataViewChange('browse')}>Browse</button><button type="button" aria-pressed={dataView === 'compare'} className={dataView === 'compare' ? 'is-active' : ''} onClick={() => onDataViewChange('compare')}>Compare</button></div>
    </header>

    {dataView === 'browse' ? <>
      <div className="intel-tabbar" role="tablist" aria-label="Data type">
        {available.map(({ id, label, count }) => <button type="button" key={id} role="tab" aria-selected={activeTab === id} className={activeTab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}<span>{count}</span></button>)}
        <span className="intel-tab-spacer" />
        <input className="intel-data-find" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter…" aria-label="Filter data" />
        <button type="button" className="intel-export" disabled={!activeCount} onClick={() => exportRows('csv')}>CSV</button>
        <button type="button" className="intel-export" disabled={!activeCount} onClick={() => exportRows('json')}>JSON</button>
      </div>
      {hasDraft && <p className="intel-data-result-note">Draft values — confirm against the cited source. Select a product or value for sources.</p>}

      {activeCount === 0 ? <div className="intel-empty"><h3>No matches</h3><p>Try another product, date, or filter.</p></div>
        : activeTab === 'specs' ? <SpecTables data={data} tables={specTables} onOpenAtlas={onOpenAtlas} />
          : activeTab === 'outcomes' ? <GroupedTabs groups={outcomeGroups} render={group => <GroupedTable<OutcomeRow> key={group.id} id={group.id} label={group.label} rows={group.rows}
            rowKey={row => row.id} product={outcomeProduct} sources={row => sourcesFor(data, splitIds(row.sourceIds))}
            detail={row => <OutcomeDetail row={row} />}
            columns={[
              { id: 'trial', label: 'Trial', width: WIDTH.cell, cell: row => ({ content: <>{row.trial}{row.nctId && <small>{row.nctId}</small>}</> }) },
              { id: 'endpoint', label: 'Endpoint', width: WIDTH.wide, cell: row => ({ content: <>{row.endpoint}<small>{row.hierarchy.replace(/_/g, ' ')}</small></> }) },
              { id: 'result', label: 'Result', width: WIDTH.cell, cell: row => ({ content: <><strong>{row.armValues}</strong><small>{row.arm}</small></> }) },
              { id: 'effect', label: 'Effect', width: WIDTH.cell, cell: row => ({ gap: row.effect === 'Not reported', content: row.effect === 'Not reported' ? '—' : <>{row.effect}{row.ci && row.ci !== 'Not reported' && <small>{row.ci}</small>}</> }) },
              { id: 'follow-up', label: 'Cohort · follow-up', width: WIDTH.cell, cell: row => ({ content: <>{row.cohort}<small>{row.followUp}</small></> }) },
            ]} />} />
            : activeTab === 'history' ? <GroupedTabs groups={historyGroups} render={group => <GroupedTable<HistoryItem> key={group.id} id={group.id} label={group.label} rows={group.rows}
              rowKey={row => `${row.id}:${row.versionId}`} product={row => productInfo(data, versionById(data, row.versionId))} sources={row => sourcesFor(data, splitIds(row.sourceIds))}
              columns={[
                { id: 'date', label: 'Date', width: WIDTH.narrow, cell: row => ({ gap: !row.date, content: row.date ? formatEvidenceDate(row.date) : '—' }) },
                { id: 'record', label: 'Record', width: WIDTH.cell, cell: row => ({ content: row.record }) },
                { id: 'change', label: 'Change', width: WIDTH.cell, cell: row => ({ content: <>{row.change}{row.recordType === 'lineage' && <small>{row.products}</small>}</> }) },
                { id: 'summary', label: 'Summary', width: WIDTH.wide + WIDTH.cell, cell: row => ({ content: row.explanation }) },
              ]} />} />
              : <GroupedTabs groups={figureGroups} render={group => <GroupedTable<FigureItem> key={group.id} id={group.id} label={group.label} rows={group.rows}
                rowKey={row => `${row.media.id}:${row.versionId}`} product={row => productInfo(data, versionById(data, row.versionId))} sources={row => sourcesFor(data, row.media.sourceRefs.map(ref => ref.sourceId))}
                columns={[
                  { id: 'figure', label: 'Figure', width: WIDTH.cell, cell: row => ({ content: <a className="intel-figure-link" href={assetUrl(row.media.assetPath)} target="_blank" rel="noreferrer"><img src={assetUrl(row.media.assetPath)} alt={row.media.alt} loading="lazy" /></a> }) },
                  { id: 'title', label: 'Title', width: WIDTH.cell, cell: row => ({ content: <>{row.media.title}{row.media.reviewStatus === 'draft' && <small>draft</small>}</> }) },
                  { id: 'caption', label: 'Caption', width: WIDTH.wide, cell: row => ({ content: row.media.caption }) },
                  { id: 'locator', label: 'Location', width: WIDTH.narrow, cell: row => ({ content: [row.media.page ? `p.${row.media.page}` : '', row.media.figure ?? ''].filter(Boolean).join(' · ') || '—' }) },
                ]} />} />}
    </> : <ComparisonView data={data} conditionId={conditionId} asOf={asOf} compareCategory={compareCategory} compareVersionIds={compareVersionIds} compareConfigurationIds={compareConfigurationIds} onCompareCategoryChange={onCompareCategoryChange} onCompareVersionIdsChange={onCompareVersionIdsChange} onCompareConfigurationIdsChange={onCompareConfigurationIdsChange} />}
  </section>
}
