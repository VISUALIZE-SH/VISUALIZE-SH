import type {
  Availability,
  ComparisonCategory,
  EvidenceClaim,
  IntelligenceData,
  ProductVersion,
  StandardAttribute,
} from '../types/intelligence'
import type { ComparativeObservation } from '../types/comparative'
import { isOnOrBefore, sourceUrls } from './intelligence'

export type ComparisonCellStatus = 'not_curated' | 'requires_configuration' | 'choose_configuration' | 'multiple_records' | Availability | ComparativeObservation['measurement_status']
export interface ComparisonCell {
  versionId: string
  claims: EvidenceClaim[]
  observations?: ComparativeObservation[]
  configurationId?: string
  status: ComparisonCellStatus
}
export interface ComparisonRow {
  attribute: StandardAttribute
  cells: ComparisonCell[]
}
export interface ComparisonProjection {
  category: ComparisonCategory
  versions: ProductVersion[]
  rows: ComparisonRow[]
}

/** Tidy export keeps each visible attribute/device cell and its evidence boundary. */
export function comparisonExportRows(
  data: IntelligenceData,
  projection: ComparisonProjection,
  rows: ComparisonRow[],
  asOf: string,
): Record<string, string | number | boolean>[] {
  const versions = new Map(projection.versions.map(version => [version.id, version]))
  return rows.flatMap(row => row.cells.map(cell => {
    const claim = cell.claims.length === 1 ? cell.claims[0] : undefined
    const observation = cell.observations?.length === 1 ? cell.observations[0] : undefined
    const refs = cell.claims.flatMap(item => item.sourceRefs)
    return {
      datasetVersion: data.schemaVersion,
      datasetUpdatedAt: data.updatedAt,
      categoryId: projection.category.id,
      category: projection.category.label,
      conditionId: projection.category.conditionId,
      attributeId: row.attribute.id,
      attribute: row.attribute.label,
      section: row.attribute.section,
      scope: row.attribute.scope,
      versionId: cell.versionId,
      familyId: versions.get(cell.versionId)?.familyId ?? '',
      version: versions.get(cell.versionId)?.name ?? cell.versionId,
      configurationId: cell.configurationId ?? '',
      status: cell.status,
      value: claim?.availability === 'reported' ? claim.value ?? '' : observation?.measurement_status === 'reported' ? observation.value ?? '' : '',
      unit: claim?.unit ?? observation?.unit ?? '',
      asOf,
      observedAt: cell.claims.map(item => item.observedAt).join('; ') || cell.observations?.map(item => item.provenance.extracted_on).join('; ') || '',
      reviewStatus: cell.claims.map(item => item.reviewStatus).join('; ') || cell.observations?.map(item => item.provenance.review_status).join('; ') || '',
      claimIds: cell.claims.map(item => item.id).join('; '),
      observationIds: cell.observations?.map(item => item.observation_id).join('; ') ?? '',
      context: cell.claims.map(item => item.context ?? '').filter(Boolean).join('; ') || cell.observations?.map(item => `${item.context.anatomy_or_model}; ${item.method.conditions_summary}`).join('; ') || '',
      limitation: cell.claims.map(item => item.limitation ?? '').filter(Boolean).join('; '),
      method: cell.observations?.map(item => item.method.modality).join('; ') ?? '',
      sourceIds: refs.map(ref => ref.sourceId).join('; '),
      sourceLocators: refs.map(ref => ref.locator).join('; ') || cell.observations?.map(item => item.provenance.locator).join('; ') || '',
      sourceUrls: sourceUrls(data, refs) || cell.observations?.map(item => item.provenance.url).join('; ') || '',
      comparability: cell.observations?.map(item => item.comparability).join('; ') ?? '',
      comparabilityRationale: cell.observations?.map(item => item.comparability_rationale).join('; ') ?? '',
    }
  }))
}

/** Project exact-version, source-linked claims into authored standard-attribute rows. */
export function projectComparison(
  data: IntelligenceData,
  categoryId: string,
  orderedVersionIds: string[],
  asOf: string,
  selectedConfigurationIds: string[] = [],
): ComparisonProjection {
  const category = (data.comparisonCategories ?? []).find(item => item.id === categoryId)
  if (!category) throw new Error(`Unknown comparison category: ${categoryId}`)
  if (new Set(orderedVersionIds).size !== orderedVersionIds.length) throw new Error('Comparison versions must be unique')

  const versionsById = new Map(data.versions.map(version => [version.id, version]))
  const versions = orderedVersionIds.map(id => {
    if (!category.versionIds.includes(id)) throw new Error(`Version ${id} is not eligible for ${categoryId}`)
    const version = versionsById.get(id)
    if (!version) throw new Error(`Unknown comparison version: ${id}`)
    return version
  })

  if (new Set(selectedConfigurationIds).size !== selectedConfigurationIds.length) throw new Error('Comparison configurations must be unique')
  const configurations = data.comparative?.device_configurations ?? []
  const categoryConfigurationIds = new Set(configurations.filter(item => category.versionIds.includes(item.product_version_id)).map(item => item.configuration_id))
  const categoryObservations = data.comparative?.observations.filter(item => categoryConfigurationIds.has(item.configuration_id)) ?? []
  const hasCuratedConfigurationMetrics = categoryObservations.some(item => data.comparative?.metric_definitions.some(metric => metric.metric_id === item.metric_id && metric.module === 'core_device_card'))
  const selectedConfigurations = selectedConfigurationIds.map(id => {
    const configuration = configurations.find(item => item.configuration_id === id)
    if (!configuration || !orderedVersionIds.includes(configuration.product_version_id)) throw new Error(`Configuration ${id} is not eligible for this comparison`)
    return configuration
  })
  if (new Set(selectedConfigurations.map(item => item.product_version_id)).size !== selectedConfigurations.length) throw new Error('Only one configuration per version may be selected')
  const configurationByVersion = new Map(selectedConfigurations.map(item => [item.product_version_id, item]))

  const rows: ComparisonRow[] = (data.standardAttributes ?? [])
    .filter(attribute => attribute.categoryIds.includes(categoryId) && (!hasCuratedConfigurationMetrics || attribute.scope === 'version_wide'))
    .slice()
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map(attribute => ({
      attribute,
      cells: orderedVersionIds.map(versionId => {
        const claims = attribute.scope === 'version_wide' ? data.claims.filter(claim =>
          claim.versionId === versionId &&
          claim.comparisonAttributeId === attribute.id &&
          isOnOrBefore(claim.observedAt, asOf),
        ) : []
        const status: ComparisonCellStatus = attribute.scope === 'configuration'
          ? 'requires_configuration'
          : claims.length > 1
            ? 'multiple_records'
            : claims[0]?.availability ?? 'not_curated'
        return { versionId, claims, status }
      }),
    }))

  // Configuration measurements only enter cells after the reader selects an
  // exact size; otherwise the cell stays an explicit gap.
  if (data.comparative) {
    for (const [index, metric] of data.comparative.metric_definitions.entries()) {
      if (metric.module !== 'core_device_card' || !categoryObservations.some(item => item.metric_id === metric.metric_id)) continue
      rows.push({
        attribute: {
          id: metric.metric_id,
          label: metric.display_name,
          section: 'Delivery and fit',
          order: 100 + index * 10,
          valueType: metric.value_kind === 'numeric' ? 'number' : 'text',
          scope: 'configuration',
          categoryIds: [categoryId],
        },
        cells: orderedVersionIds.map(versionId => {
          const configuration = configurationByVersion.get(versionId)
          const observations = configuration
            ? data.comparative!.observations.filter(item => item.configuration_id === configuration.configuration_id && item.metric_id === metric.metric_id && isOnOrBefore(item.provenance.extracted_on, asOf))
            : []
          const status: ComparisonCellStatus = !configuration
            ? configurations.some(item => item.product_version_id === versionId) ? 'choose_configuration' : 'not_curated'
            : observations.length > 1
              ? 'multiple_records'
              : observations[0]?.measurement_status ?? 'not_curated'
          return { versionId, configurationId: configuration?.configuration_id, claims: [], observations, status }
        }),
      })
    }
  }

  return { category, versions, rows }
}
