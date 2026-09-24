/**
 * Merge the comparison taxonomy and compact catalog fragments into the authored
 * intelligence document before schema validation. Fragments keep per-class
 * curation reviewable; `specs` expand into ordinary draft claims so the public
 * payload and validator see one uniform claim model.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import yaml from 'js-yaml'

type Doc = Record<string, unknown>
interface Attribute { id: string; label: string; section: string; categoryIds: string[] }
interface Category { id: string; versionIds: string[] }

const MERGED = ['sources', 'families', 'versions', 'claims', 'decisions', 'indications', 'media'] as const
const FRAGMENT_KEYS = new Set<string>([...MERGED, 'observedAt', 'specs'])
const VALUE_KEYS = new Set(['value', 'unit', 'loc', 'source', 'availability', 'basis', 'context', 'limitation', 'observedAt'])

export interface IntelligenceSourcePaths { input: string; taxonomy?: string; catalogDir?: string }

export function defaultIntelligencePaths(root: string): Required<IntelligenceSourcePaths> {
  return {
    input: resolve(root, 'data/intelligence/pilot.yaml'),
    taxonomy: resolve(root, 'data/intelligence/taxonomy.yaml'),
    catalogDir: resolve(root, 'data/intelligence/catalog'),
  }
}

function load(path: string): unknown {
  return yaml.load(readFileSync(path, 'utf8'), { schema: yaml.CORE_SCHEMA })
}

function record(value: unknown, label: string): Doc {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a mapping`)
  return value as Doc
}

function list(value: unknown, label: string): unknown[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new Error(`${label} must be a list`)
  return value
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`)
  return value
}

/** Identity and design-like sections are design claims; trial names are evidence; the rest describe fit/use. */
function claimCategory(attribute: Attribute): 'design' | 'fit' | 'evidence' {
  if (attribute.id === 'pivotal-trials') return 'evidence'
  return ['Identity', 'Design', 'Pharmacology'].includes(attribute.section) ? 'design' : 'fit'
}

function expandSpecs(fragment: Doc, name: string, attributes: Map<string, Attribute>, categories: Map<string, Category>): Doc[] {
  const defaultObservedAt = fragment.observedAt
  return list(fragment.specs, `${name}.specs`).flatMap((specValue, index) => {
    const spec = record(specValue, `${name}.specs[${index}]`)
    const versionId = text(spec.version, `${name}.specs[${index}].version`)
    const label = `${name} ${versionId}`
    const categoryIds = spec.category === undefined ? [] : Array.isArray(spec.category) ? spec.category : [spec.category]
    for (const categoryId of categoryIds) {
      const category = categories.get(text(categoryId, `${label}.category`))
      if (!category) throw new Error(`${label}.category references unknown taxonomy category ${String(categoryId)}`)
      if (!category.versionIds.includes(versionId)) category.versionIds.push(versionId)
    }
    const values = record(spec.values ?? {}, `${label}.values`)
    return Object.entries(values).map(([attributeId, raw]) => {
      const attribute = attributes.get(attributeId)
      if (!attribute) throw new Error(`${label}.values.${attributeId} is not a taxonomy standard attribute`)
      const entry = typeof raw === 'string' || typeof raw === 'number' ? { value: raw } : record(raw, `${label}.values.${attributeId}`)
      for (const key of Object.keys(entry)) if (!VALUE_KEYS.has(key)) throw new Error(`${label}.values.${attributeId} has unknown key ${key}`)
      const sourceId = text(entry.source ?? spec.source, `${label}.values.${attributeId}.source`)
      const availability = entry.availability ?? (entry.value === undefined ? undefined : 'reported')
      if (!availability) throw new Error(`${label}.values.${attributeId} needs a value or an availability status`)
      return {
        id: `claim-${versionId.replace(/^ver-/, '')}-${attributeId}`,
        versionId,
        category: claimCategory(attribute),
        key: attributeId,
        label: attribute.label.replace(/ \(by size\)$/, ''),
        comparisonAttributeId: attributeId,
        ...(availability === 'reported' ? { value: entry.value } : {}),
        ...(entry.unit === undefined ? {} : { unit: entry.unit }),
        availability,
        basis: entry.basis ?? 'directly_reported',
        ...(entry.context === undefined ? {} : { context: entry.context }),
        ...(entry.limitation === undefined ? {} : { limitation: entry.limitation }),
        observedAt: entry.observedAt ?? spec.observedAt ?? defaultObservedAt,
        sourceRefs: [{ sourceId, locator: text(entry.loc, `${label}.values.${attributeId}.loc`) }],
        reviewStatus: 'draft',
      }
    })
  })
}

/** Combine the authored pilot with the taxonomy and each catalog fragment, in file-name order. */
export function mergeCatalog(base: unknown, taxonomy: unknown, fragments: Array<{ name: string; data: unknown }>): Doc {
  const merged: Doc = { ...record(base, 'intelligence input') }
  if (taxonomy !== undefined) {
    const tax = record(taxonomy, 'taxonomy')
    for (const key of ['comparisonCategories', 'standardAttributes'] as const) {
      merged[key] = [...list(merged[key], key), ...list(tax[key], `taxonomy.${key}`).map(item => structuredClone(item))]
    }
  }
  const attributes = new Map(list(merged.standardAttributes, 'standardAttributes').map(item => [(item as Attribute).id, item as Attribute]))
  const categories = new Map(list(merged.comparisonCategories, 'comparisonCategories').map(item => [(item as Category).id, item as Category]))
  for (const { name, data } of fragments) {
    const fragment = record(data ?? {}, name)
    for (const key of Object.keys(fragment)) if (!FRAGMENT_KEYS.has(key)) throw new Error(`${name} has unsupported top-level key ${key}`)
    for (const key of MERGED) if (fragment[key] !== undefined) merged[key] = [...list(merged[key], key), ...list(fragment[key], `${name}.${key}`)]
    merged.claims = [...list(merged.claims, 'claims'), ...expandSpecs(fragment, name, attributes, categories)]
  }
  // Taxonomy categories are placeholders until a fragment or the pilot places a version in them.
  const populated = new Set([...categories.values()].filter(category => category.versionIds.length).map(category => category.id))
  merged.comparisonCategories = [...categories.values()].filter(category => populated.has(category.id))
  merged.standardAttributes = [...attributes.values()]
    .map(attribute => ({ ...attribute, categoryIds: attribute.categoryIds.filter(id => populated.has(id)) }))
    .filter(attribute => attribute.categoryIds.length)
  return merged
}

export function loadIntelligenceSource(paths: IntelligenceSourcePaths): Doc {
  const fragments = paths.catalogDir && existsSync(paths.catalogDir)
    ? readdirSync(paths.catalogDir).filter(file => /\.ya?ml$/.test(file)).sort().map(file => ({ name: file, data: load(join(paths.catalogDir!, file)) }))
    : []
  return mergeCatalog(load(paths.input), paths.taxonomy && existsSync(paths.taxonomy) ? load(paths.taxonomy) : undefined, fragments)
}
