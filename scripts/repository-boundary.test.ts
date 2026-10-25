import assert from 'node:assert/strict'
import test from 'node:test'
import { repositoryBoundaryViolation } from './repository-boundary'

test('private engine and raw artifact roots are rejected for any file type', () => {
  for (const root of ['discovery-engine', 'runs', 'signals', 'watchlists', 'snapshots', 'vault', 'candidates', 'crosswalk', 'exports']) {
    assert.ok(repositoryBoundaryViolation(`${root}/2026-10-24/file.bin`), root)
  }
  assert.ok(repositoryBoundaryViolation('./discovery-engine/AGENTS.md'))
  assert.ok(repositoryBoundaryViolation('snapshots\\source.pdf'))
})

test('research, screening, discovery prompts and review receipts stay private', () => {
  for (const file of [
    'docs/RESEARCH_LAPLACE_2026-10-09.md',
    'docs/ATLAS_RELATIONSHIP_RESEARCH_2026-10-15.md',
    'docs/SIEGEL_RHENIUM_REVIEW_2026-10-14.md',
    'docs/COLLECTION_APPROVAL_2026-10-17.md',
    'docs/data-updates/2026-10-24-lsi-intake.md',
    'docs/screening/2026-10-24.md',
    'docs/source-discovery/results.json',
    'docs/lead-discovery/notes.md',
    'docs/review-outcomes/2026-10-24.md',
    'docs/LSI_SCREENING_2026-10-24.md',
    'prompts/research.md',
    'prompts/source-lead-review.md',
    'prompts/lead-discovery.md',
    'prompts/research/run.md',
    'public/screenshots/lsi-screen-01.png',
    'docs/assets/discovery-screenshots/source.webp',
    'docs/assets/screenshot-lsi-2026-10-24.png',
  ]) assert.ok(repositoryBoundaryViolation(file), file)
})

test('accepted records, reader assets, software reviews and public policy remain allowed', () => {
  for (const file of [
    'data/intelligence/catalog/research-2026-10.yaml',
    'data/intelligence/catalog/lsi-screened-2026-10.yaml',
    'data/intelligence/citations.yaml',
    'public/intelligence.json',
    'public/graph.json',
    'public/evidence/fda/lsi-device.png',
    'public/evidence/publications/research-figure.png',
    'public/editorials/research-history/content.html',
    'public/previews/newsletter/2026-10-24/index.html',
    'artifacts/newsletter-review/2026-10-24/index.html',
    'docs/SECURITY_REVIEW.md',
    'docs/ATLAS_LAYOUT_OPTIONS_2026-10-15.md',
    'docs/SOURCE_CURATION_POLICY.md',
    'docs/EVIDENCE_PIPELINE.md',
    'docs/NEWS_INSIGHTS_WORKFLOW.md',
    'docs/assets/atlas-screenshot.png',
    'prompts/news-insights.md',
    'scripts/repository-boundary.test.ts',
  ]) assert.equal(repositoryBoundaryViolation(file), undefined, file)
})
