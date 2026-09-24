import assert from 'node:assert/strict'
import test from 'node:test'
import { issueDateArgument, publicOrigin } from './check-newsletter-delivery'

test('delivery check accepts only an exact issue date and site origin', () => {
  assert.equal(issueDateArgument(['--date', '2026-09-20']), '2026-09-20')
  assert.throws(() => issueDateArgument(['--date', '2026-02-30']))
  assert.throws(() => issueDateArgument(['--date', '../other']))
  assert.equal(publicOrigin('https://visualize-sh.com', 'visualize-sh.com'), 'https://visualize-sh.com')
  assert.throws(() => publicOrigin('https://other.example', 'visualize-sh.com'))
  assert.throws(() => publicOrigin('https://visualize-sh.com/elsewhere', 'visualize-sh.com'))
})
