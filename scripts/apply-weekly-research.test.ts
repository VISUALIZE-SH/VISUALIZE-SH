import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { blocks, replacePulse } from './apply-weekly-research'

test('preserves news blocks while extracting deterministic metadata', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visualize-sh-news-'))
  const path = join(directory, 'news.yaml')
  try {
    writeFileSync(path, '# Header\n\n- id: news-2026-01-02-b\n  publishedAt: "2026-01-02"\n\n- id: news-2026-01-01-a\n  publishedAt: "2026-01-01"\n')
    const parsed = blocks(path)
    assert.equal(parsed.header, '# Header')
    assert.deepEqual(parsed.entries.map(item => item.id), ['news-2026-01-02-b', 'news-2026-01-01-a'])
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('updates or inserts Pulse without rewriting the entity block', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visualize-sh-pulse-'))
  const path = join(directory, 'entities.yaml')
  try {
    writeFileSync(path, '- id: cond-a\n  type: condition\n  pulse: 2\n  curation: { status: curated, lastUpdated: 2026-01-01 }\n\n- id: cond-b\n  type: condition\n  curation: { status: curated, lastUpdated: 2026-01-01 }\n')
    replacePulse(path, 'cond-a', 8)
    replacePulse(path, 'cond-b', 5)
    const result = readFileSync(path, 'utf8')
    assert.match(result, /- id: cond-a[\s\S]*?  pulse: 8/)
    assert.match(result, /- id: cond-b[\s\S]*?  pulse: 5\n  curation:/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
