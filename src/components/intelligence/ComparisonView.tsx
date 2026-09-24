import { Fragment, useState } from 'react'
import type { ComparisonCell, ComparisonRow } from '../../data/comparison'
import { comparisonExportRows, projectComparison } from '../../data/comparison'
import { displayValue, formatEvidenceDate, rowsToCsv, sourceFor, sourceProvenance, sourceUrl, versionName } from '../../data/intelligence'
import { approvalLabel, firstDecision, thumbnailFor } from '../../data/spec-tables'
import type { ComparativeObservation } from '../../types/comparative'
import type { EvidenceClaim, IntelligenceData } from '../../types/intelligence'
import ComparisonMediaStrip from './ComparisonMediaStrip'

interface Props {
  data: IntelligenceData
  conditionId: string
  asOf: string
  compareCategory: string
  compareVersionIds: string[]
  compareConfigurationIds: string[]
  onCompareCategoryChange: (categoryId: string) => void
  onCompareVersionIdsChange: (versionIds: string[]) => void
  onCompareConfigurationIdsChange: (configurationIds: string[]) => void
}

function assetPath(path: string): string {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  return `${base}${path.replace(/^\/+/, '')}`
}

function download(filename: string, content: string, type: string): void {
  const href = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  window.setTimeout(() => { URL.revokeObjectURL(href); anchor.remove() }, 1_000)
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    reported: 'Reported', not_curated: 'Not curated', requires_configuration: 'Needs exact configuration',
    choose_configuration: 'Choose exact configuration', not_extracted: 'Not extracted',
    not_reported: 'Not reported in scoped source', tested_not_publicly_disclosed: 'Tested; value not public',
    not_yet_reviewed: 'Not yet reviewed', not_publicly_disclosed: 'Not publicly disclosed',
    not_applicable: 'Not applicable', conflicting: 'Conflicting public record',
    conflicting_sources: 'Conflicting sources', multiple_records: 'Multiple records',
  }
  return labels[status] ?? status.replace(/_/g, ' ')
}

function displayCell(cell: ComparisonCell): string {
  if (cell.claims.length === 1) {
    const claim = cell.claims[0]
    return displayValue(claim.value, claim.unit, claim.availability)
  }
  if (cell.observations?.length === 1) {
    const observation = cell.observations[0]
    if (observation.measurement_status === 'reported') return `${observation.value}${observation.unit ? ` ${observation.unit}` : ''}`
  }
  return statusLabel(cell.status)
}

function ClaimDetail({ data, claim, versionId }: { data: IntelligenceData; claim: EvidenceClaim; versionId: string }) {
  const provenance = sourceProvenance(claim.sourceRefs)
  const url = sourceUrl(data, claim.sourceRefs)
  return <div className="intel-compare-detail-record">
    <strong>{versionName(data, versionId)} · {claim.label}</strong>
    <p>{claim.context || 'No additional interpretation context is recorded.'}</p>
    {claim.limitation && <p>Boundary: {claim.limitation}</p>}
    <p>Observed {formatEvidenceDate(claim.observedAt)} · {claim.reviewStatus} · {claim.basis.replace(/_/g, ' ')}</p>
    {url && <a href={url} target="_blank" rel="noreferrer">{sourceFor(data, claim.sourceRefs)} · {provenance.locators} ↗</a>}
  </div>
}

function ObservationDetail({ data, observation, versionId }: { data: IntelligenceData; observation: ComparativeObservation; versionId: string }) {
  return <div className="intel-compare-detail-record">
    <strong>{versionName(data, versionId)} · {observation.context.configuration_context ?? observation.configuration_id}</strong>
    <p>Method: {observation.method.modality} · {observation.method.conditions_summary}</p>
    <p>Scope: {observation.context.anatomy_or_model} · {observation.context.cohort_or_sample}</p>
    <p>Comparability: {observation.comparability.replace(/_/g, ' ')}. {observation.comparability_rationale}</p>
    <p>{statusLabel(observation.measurement_status)} · {observation.provenance.review_status} · extracted {observation.provenance.extracted_on}</p>
    <a href={observation.provenance.url} target="_blank" rel="noreferrer">{observation.provenance.source_type.replace(/_/g, ' ')} · {observation.provenance.locator} ↗</a>
  </div>
}

function ComparisonTable({ data, rows, versionIds, asOf }: { data: IntelligenceData; rows: ComparisonRow[]; versionIds: string[]; asOf: string }) {
  const [openDetail, setOpenDetail] = useState<string | null>(null)
  const manufacturer = (id: string) => data.families.find(family => family.id === data.versions.find(version => version.id === id)?.familyId)?.manufacturer ?? ''
  return <div className="intel-compare-scroll" role="region" aria-label="Device comparison table" tabIndex={0}>
    <table className="intel-compare-table">
      <caption className="intel-visually-hidden">Device standard attributes by exact product version and selected configuration</caption>
      <thead><tr><th scope="col">Attribute</th>{versionIds.map(id => {
        const thumb = thumbnailFor(data, id)
        return <th scope="col" key={id}><span className="intel-product">{thumb ? <img className="intel-thumb" src={assetPath(thumb.assetPath)} alt={`${versionName(data, id)}: ${thumb.alt}`} /> : <span className="intel-thumb intel-thumb-empty" aria-hidden="true" />}<span className="intel-product-text">{versionName(data, id)}<span className="intel-compare-maker">{manufacturer(id)}</span></span></span></th>
      })}</tr></thead>
      <tbody>
        <tr><th scope="row">US approval</th>{versionIds.map(id => {
          const decision = firstDecision(data, id, 'US', asOf)
          return <td key={id} className={decision ? undefined : 'is-gap'} title={decision ? `${decision.identifier} · ${formatEvidenceDate(decision.date)}` : undefined}>{decision ? <><strong>{approvalLabel(decision)}</strong>{decision.changeType === 'indication' && <span className="intel-compare-maker">indication</span>}</> : '—'}</td>
        })}</tr>
        {rows.map((row, index) => {
        const selectedCell = row.cells.find(cell => openDetail === `${row.attribute.id}:${cell.versionId}`)
        return <Fragment key={row.attribute.id}>
          {(index === 0 || rows[index - 1].attribute.section !== row.attribute.section) && <tr className="intel-compare-section"><th colSpan={versionIds.length + 1}>{row.attribute.section}</th></tr>}
          <tr><th scope="row">{row.attribute.label}</th>{row.cells.map(cell => {
            const key = `${row.attribute.id}:${cell.versionId}`
            const hasEvidence = cell.claims.length > 0 || Boolean(cell.observations?.length)
            const restriction = cell.observations?.some(observation => observation.comparability === 'not_comparable')
              ? 'Not cross-device comparable'
              : cell.observations?.some(observation => observation.comparability === 'within_family_only')
                ? 'Within-family only'
                : cell.observations?.some(observation => observation.comparability === 'conditional')
                  ? 'Conditional'
                  : ''
            const reported = cell.status === 'reported'
            return <td key={cell.versionId} className={reported ? undefined : 'is-gap'}>
              {hasEvidence
                ? <button type="button" className="intel-compare-value" aria-label={`${displayCell(cell)} — source for ${row.attribute.label} on ${versionName(data, cell.versionId)}`} aria-expanded={openDetail === key} onClick={() => setOpenDetail(openDetail === key ? null : key)}>{reported ? displayCell(cell) : statusLabel(cell.status)}</button>
                : <span>{cell.status === 'not_curated' ? '—' : statusLabel(cell.status)}</span>}
              {restriction && <span className="intel-compare-caution">{restriction}</span>}
            </td>
          })}</tr>
          {selectedCell && <tr className="intel-compare-detail"><td colSpan={versionIds.length + 1}>
            {selectedCell.claims.map(claim => <ClaimDetail key={claim.id} data={data} claim={claim} versionId={selectedCell.versionId} />)}
            {selectedCell.observations?.map(observation => <ObservationDetail key={observation.observation_id} data={data} observation={observation} versionId={selectedCell.versionId} />)}
          </td></tr>}
        </Fragment>
      })}</tbody>
    </table>
  </div>
}

export default function ComparisonView({
  data, conditionId, asOf, compareCategory, compareVersionIds, compareConfigurationIds,
  onCompareCategoryChange, onCompareVersionIdsChange, onCompareConfigurationIdsChange,
}: Props) {
  const [showAllAttributes, setShowAllAttributes] = useState(false)
  const categories = (data.comparisonCategories ?? [])
    .filter(category => (!conditionId || category.conditionId === conditionId) && category.versionIds.length >= 2)
    .sort((left, right) => (left.order ?? 999) - (right.order ?? 999) || left.label.localeCompare(right.label))
  const category = categories.find(item => item.id === compareCategory)
  const comparison = category ? projectComparison(data, category.id, compareVersionIds, asOf, compareConfigurationIds) : null
  const rows = comparison?.rows.filter(row => row.attribute.section !== 'Identity' && (showAllAttributes || row.cells.some(cell => !['not_curated', 'requires_configuration', 'choose_configuration'].includes(cell.status)))) ?? []
  const eligibleVersions = category ? data.versions.filter(version => category.versionIds.includes(version.id)) : []
  const familyOptions = [...new Set(eligibleVersions.map(version => version.familyId))].map(id => ({
    id,
    label: data.families.find(family => family.id === id)?.name ?? 'Product family',
    versions: eligibleVersions.filter(version => version.familyId === id && !compareVersionIds.includes(version.id)),
  }))
  const exampleIds = category ? ['SAPIEN 3', 'Evolut FX'].map(name => eligibleVersions.find(version => version.name === name)?.id).filter((id): id is string => Boolean(id)) : []
  const configurations = data.comparative?.device_configurations ?? []
  const selectedConfigurationByVersion = new Map(compareConfigurationIds.map(id => {
    const configuration = configurations.find(item => item.configuration_id === id)
    return configuration ? [configuration.product_version_id, id] as const : ['', ''] as const
  }).filter(([versionId]) => Boolean(versionId)))

  if (!categories.length) return <section className="intel-compare" aria-label="Compare device versions"><div className="intel-empty"><h3>Nothing to compare yet</h3><p>No comparable products are curated for this condition.</p></div></section>

  return <section className="intel-compare" aria-label="Compare device versions">
    <div className="intel-compare-controls">
      <label className="intel-compare-category">Category<select value={category?.id ?? ''} onChange={event => onCompareCategoryChange(event.target.value)}><option value="">Choose…</option>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      {category && <div className="intel-compare-selection" aria-label="Selected versions">
        {compareVersionIds.map((id, index) => <div className="intel-compare-chip" key={id}>
          <span>{versionName(data, id)}</span>
          <button type="button" aria-label={`Move ${versionName(data, id)} left`} disabled={index === 0} onClick={() => { const next = [...compareVersionIds]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onCompareVersionIdsChange(next) }}>←</button>
          <button type="button" aria-label={`Move ${versionName(data, id)} right`} disabled={index === compareVersionIds.length - 1} onClick={() => { const next = [...compareVersionIds]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; onCompareVersionIdsChange(next) }}>→</button>
          <button type="button" aria-label={`Remove ${versionName(data, id)}`} onClick={() => onCompareVersionIdsChange(compareVersionIds.filter(item => item !== id))}>×</button>
        </div>)}
        {compareVersionIds.length < 4 && familyOptions.some(family => family.versions.length) && <select className="intel-compare-add" aria-label="Add product" value="" onChange={event => event.target.value && onCompareVersionIdsChange([...compareVersionIds, event.target.value])}><option value="">+ Add product</option>{familyOptions.map(family => <optgroup key={family.id} label={family.label}>{family.versions.map(version => <option key={version.id} value={version.id}>{version.name}</option>)}</optgroup>)}</select>}
        {exampleIds.length === 2 && compareVersionIds.length === 0 && <button type="button" className="intel-link-button" onClick={() => onCompareVersionIdsChange(exampleIds)}>Try SAPIEN 3 vs Evolut FX</button>}
      </div>}
      <div className="intel-compare-actions">
        <label className="intel-compare-all"><input type="checkbox" checked={showAllAttributes} onChange={event => setShowAllAttributes(event.target.checked)} /> Empty rows</label>
        {(['csv', 'json'] as const).map(format => <button type="button" className="intel-export" key={format} disabled={compareVersionIds.length < 2 || !rows.length} onClick={() => {
          if (!comparison) return
          const exported = comparisonExportRows(data, comparison, rows, asOf)
          const content = format === 'csv' ? rowsToCsv(exported) : JSON.stringify({ category: comparison.category.id, versionIds: compareVersionIds, configurationIds: compareConfigurationIds, rows: exported }, null, 2)
          download(`visualize-sh-comparison-${asOf || 'all'}.${format}`, content, format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json')
        }}>{format.toUpperCase()}</button>)}
      </div>
    </div>

    {compareVersionIds.length > 0 && configurations.some(item => compareVersionIds.includes(item.product_version_id)) && <div className="intel-compare-configs" aria-label="Exact configurations">
      {compareVersionIds.map(versionId => {
        const options = configurations.filter(item => item.product_version_id === versionId)
        return options.length > 0 && <label key={versionId}>{versionName(data, versionId)} size
          <select value={selectedConfigurationByVersion.get(versionId) ?? ''} onChange={event => {
            const retained = compareConfigurationIds.filter(id => configurations.find(item => item.configuration_id === id)?.product_version_id !== versionId)
            onCompareConfigurationIdsChange(event.target.value ? [...retained, event.target.value] : retained)
          }}>
            <option value="">Choose size…</option>
            {options.map(item => <option key={item.configuration_id} value={item.configuration_id}>{item.configuration_label}</option>)}
          </select>
        </label>
      })}
    </div>}

    {!category ? <div className="intel-empty"><h3>Choose a category</h3></div>
      : compareVersionIds.length < 2 ? <div className="intel-empty"><h3>Add at least two products</h3></div>
        : <><p className="intel-compare-note">Draft values. Select a value for its source, method, and comparability.{data.media?.some(item => item.versionIds.some(id => compareVersionIds.includes(id))) && <> <a href="#compare-source-figures">Figures ↓</a></>}</p><ComparisonTable key={compareVersionIds.join(':')} data={data} rows={rows} versionIds={compareVersionIds} asOf={asOf} /></>}
    {category && <ComparisonMediaStrip data={data} versionIds={compareVersionIds} />}
  </section>
}
