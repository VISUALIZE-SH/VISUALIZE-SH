import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { approvalLabel, firstDecision, projectSpecTables } from '../src/data/spec-tables'
import { scopeToCondition } from '../src/data/workspace-state'
import type { IntelligenceData } from '../src/types/intelligence'
import { defaultIntelligencePaths, loadIntelligenceSource } from './intelligence/catalog'

function authored(): IntelligenceData {
  return loadIntelligenceSource(defaultIntelligencePaths(fileURLToPath(new URL('..', import.meta.url)))) as unknown as IntelligenceData
}

test('spec tables list every version once, in category order, without empty columns', () => {
  const data = authored()
  const tables = projectSpecTables(data)
  const rows = tables.flatMap(table => table.rows.map(row => row.version.id))
  assert.equal(rows.length, new Set(rows).size)
  assert.equal(rows.length, data.versions.length)
  const orders = tables.filter(table => table.category).map(table => table.category!.order ?? 999)
  assert.deepEqual(orders, [...orders].sort((left, right) => left - right))
  for (const table of tables) {
    for (const [index, column] of table.columns.entries()) {
      assert.ok(table.rows.some(row => row.cells[index].length), `${table.id} column ${column.id} is empty`)
    }
    // Identity attributes are shown in the row header, never as columns.
    assert.ok(!table.columns.some(column => ['manufacturer', 'family', 'exact-version'].includes(column.id)))
  }
})

test('spec tables respect condition scope, product selection, and filter text', () => {
  const data = scopeToCondition(authored(), 'cond-as')
  const tavr = projectSpecTables(data).find(table => table.id === 'aortic-tavr-valves')
  assert.ok(tavr?.rows.some(row => row.version.id === 'ver-sapien-3'))
  assert.deepEqual(projectSpecTables(data, { versionId: 'ver-sapien-3' }).flatMap(table => table.rows.map(row => row.version.id)), ['ver-sapien-3'])
  const filtered = projectSpecTables(data, { query: 'cobalt' }).flatMap(table => table.rows.map(row => row.version.id))
  assert.ok(filtered.includes('ver-sapien-3'))
  assert.ok(!filtered.includes('ver-evolut-fx'))
})

test('first decision is the earliest in scope and dated evidence hides later decisions', () => {
  const data = authored()
  const sapien = firstDecision(data, 'ver-sapien-3', 'US')
  assert.equal(sapien?.identifier, 'P140031')
  assert.equal(approvalLabel(sapien), 'PMA · 2015')
  assert.equal(firstDecision(data, 'ver-sapien-3', 'US', '2014-12-31'), undefined)
})
