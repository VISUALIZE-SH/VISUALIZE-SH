import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)
const schema = JSON.parse(readFileSync(new URL('../schema/therapy.schema.json', import.meta.url), 'utf8'))
const validate = ajv.compile(schema)

test('unverified implant materials may remain empty only for a draft device', () => {
  const device = {
    id: 'dev-test-laa', type: 'therapy', therapyType: 'device', name: 'Test LAA device',
    treats: ['cond-af'], regulatoryStatus: 'unknown', materials: [],
    curation: { status: 'draft', lastUpdated: '2026-09-27' },
  }
  assert.equal(validate(device), true, JSON.stringify(validate.errors))
  assert.equal(validate({ ...device, curation: { ...device.curation, status: 'curated' } }), false)
  assert.ok(validate.errors?.some(error => error.instancePath === '/materials' && error.keyword === 'minItems'))
  assert.equal(validate({ ...device, curation: { ...device.curation, status: 'curated' }, materials: [{
    name: 'Nitinol', role: 'Frame', category: 'frame', source: 'https://example.org/source',
  }] }), true, JSON.stringify(validate.errors))
})
