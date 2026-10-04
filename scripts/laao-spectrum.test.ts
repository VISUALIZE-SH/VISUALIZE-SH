import assert from 'node:assert/strict'
import test from 'node:test'
import { resolve } from 'node:path'
import type { IntelligenceData } from '../src/types/intelligence'
import { scopeToCondition } from '../src/data/workspace-state'
import { projectSpecTables } from '../src/data/spec-tables'
import { defaultIntelligencePaths, loadIntelligenceSource } from './intelligence/catalog'

const ROOT = resolve(import.meta.dirname, '..')
const expectedEndocardial = [
  'ver-plaato', 'ver-watchman-original', 'ver-watchman-flx-2015', 'ver-watchman-flx',
  'ver-watchman-flx-pro', 'ver-amplatzer-cardiac-plug', 'ver-amulet', 'ver-amulet-360',
  'ver-wavecrest', 'ver-occlutech-laa-original', 'ver-occlutech-laa-redesigned',
  'ver-lambre', 'ver-sideris-patch', 'ver-prolipsis', 'ver-ultraseal', 'ver-ultraseal-ii',
  'ver-seala', 'ver-lefort', 'ver-pfm-laa', 'ver-claas', 'ver-laminar', 'ver-omega-laa',
  'ver-lacbes',
]
const expectedExclusion = [
  'ver-lariat', 'ver-sierra', 'ver-cardioblate-closure', 'ver-atriclip', 'ver-ecliptis',
]

test('article inventory appears in AF-scoped Data tables and Atlas profile families', () => {
  const authored = loadIntelligenceSource(defaultIntelligencePaths(ROOT)) as unknown as IntelligenceData
  const af = scopeToCondition(authored, 'cond-af')
  const tables = projectSpecTables(af)
  const byCategory = new Map(tables.map(table => [table.id, new Set(table.rows.map(row => row.version.id))]))
  const atlasVersions = new Set(af.families.flatMap(family => af.versions.filter(version => version.familyId === family.id).map(version => version.id)))

  for (const id of expectedEndocardial) {
    assert.ok(byCategory.get('laao-occluders')?.has(id), `${id} absent from endocardial Data table`)
    assert.ok(atlasVersions.has(id), `${id} absent from Atlas profile families`)
  }
  for (const id of expectedExclusion) {
    assert.ok(byCategory.get('laa-exclusion-ligation')?.has(id), `${id} absent from exclusion Data table`)
    assert.ok(atlasVersions.has(id), `${id} absent from Atlas profile families`)
    assert.ok(!byCategory.get('laao-occluders')?.has(id), `${id} incorrectly grouped with endocardial devices`)
  }
  assert.match(tables.find(table => table.id === 'laao-occluders')?.label ?? '', /LAAO\/LAAC/)
})

test('historical generations retain distinct dated evidence and draft source links', () => {
  const authored = loadIntelligenceSource(defaultIntelligencePaths(ROOT)) as unknown as IntelligenceData
  const ids = [...expectedEndocardial, ...expectedExclusion]
  for (const id of ids) {
    const version = authored.versions.find(item => item.id === id)
    assert.ok(version, `${id} missing`)
    assert.equal(version.reviewStatus, 'draft')
    assert.ok(version.sourceRefs.length, `${id} lacks source references`)
    for (const ref of version.sourceRefs) assert.ok(authored.sources.some(source => source.id === ref.sourceId), `${id} references missing source ${ref.sourceId}`)
  }
  const original = authored.decisions.find(item => item.versionIds.includes('ver-watchman-original'))
  const modern = authored.decisions.find(item => item.versionIds.includes('ver-watchman-flx') && item.date.value === '2020-07-21')
  assert.equal(original?.date.value, '2015-03-13')
  assert.ok(modern, 'redesigned 2020 FLX decision missing')
  assert.ok(!authored.decisions.some(item => item.versionIds.includes('ver-watchman-flx-2015') && item.jurisdiction === 'US'), 'withdrawn early FLX must not inherit 2020 US authorization')
  assert.match(authored.versions.find(item => item.id === 'ver-omega-laa')?.summary ?? '', /recall/i)
  assert.match(authored.versions.find(item => item.id === 'ver-laminar')?.summary ?? '', /suspended/i)
  assert.match(authored.versions.find(item => item.id === 'ver-amulet-360')?.summary ?? '', /US investigational/i)
})
