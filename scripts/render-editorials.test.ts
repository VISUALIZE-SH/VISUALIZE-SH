import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import yaml from 'js-yaml'
import { renderEditorials } from './render-editorials'

const entry = { newsId: 'news-editorial', slug: 'design-series-part-1', sourceFile: 'part-1.html' }
const html = '<!doctype html><html><body><header>Editorial · October 15, 2026</header><h1>Original reader</h1></body></html>'

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'editorial-reader-'))
  const sourceDir = join(root, 'sources')
  const outputDir = join(root, 'dist')
  const indexPath = join(root, 'index.yaml')
  const newsPath = join(root, 'news.yaml')
  mkdirSync(sourceDir)
  writeFileSync(join(sourceDir, entry.sourceFile), html)
  const write = (entries: unknown = [entry], news: unknown = [{ id: entry.newsId, contentType: 'editorial', reviewStatus: 'draft' }]) => {
    writeFileSync(indexPath, yaml.dump(entries))
    writeFileSync(newsPath, yaml.dump(news))
  }
  write()
  return {
    sourceDir, outputDir, indexPath, newsPath,
    destination: join(outputDir, 'editorials', entry.slug, 'index.html'),
    write,
    render(includeDrafts = false) { return renderEditorials({ sourceDir, outputDir, indexPath, newsPath, includeDrafts }) },
    clean() { rmSync(root, { recursive: true, force: true }) },
  }
}

test('default rendering excludes drafts and removes stale managed draft output', () => {
  const f = fixture()
  try {
    assert.deepEqual(f.render(), { renderedNewsIds: [], skippedDraftNewsIds: [entry.newsId] })
    assert.equal(existsSync(f.destination), false)
    f.render(true)
    assert.equal(readFileSync(f.destination, 'utf8'), html)
    const unrelated = join(f.outputDir, 'editorials', 'unmanaged')
    mkdirSync(unrelated)
    writeFileSync(join(unrelated, 'index.html'), 'preserve')
    const before = readFileSync(f.newsPath, 'utf8')
    assert.deepEqual(f.render(), { renderedNewsIds: [], skippedDraftNewsIds: [entry.newsId] })
    assert.equal(existsSync(join(f.outputDir, 'editorials', entry.slug)), false)
    assert.equal(readFileSync(join(unrelated, 'index.html'), 'utf8'), 'preserve')
    assert.equal(readFileSync(f.newsPath, 'utf8'), before, 'rendering never promotes a draft')
  } finally { f.clean() }
})

test('reviewed readers are copied byte-for-byte at their canonical slug and can rerender', () => {
  const f = fixture()
  try {
    f.write([entry], [{ id: entry.newsId, contentType: 'editorial', reviewStatus: 'reviewed' }])
    assert.deepEqual(f.render(), { renderedNewsIds: [entry.newsId], skippedDraftNewsIds: [] })
    assert.equal(readFileSync(f.destination, 'utf8'), html)
    const revised = html.replace('Original reader', 'Revised reader')
    writeFileSync(join(f.sourceDir, entry.sourceFile), revised)
    f.render()
    assert.equal(readFileSync(f.destination, 'utf8'), revised)
  } finally { f.clean() }
})

test('unsafe slugs and source filenames fail before mutating existing output', () => {
  const f = fixture()
  try {
    f.render(true)
    for (const slug of ['../escape', '/absolute', 'nested/slug', 'a\\b', '.', '', 'Encoded%2fpath']) {
      f.write([{ ...entry, slug }])
      assert.throws(() => f.render(), /Invalid editorial slug/)
      assert.equal(readFileSync(f.destination, 'utf8'), html)
    }
    for (const sourceFile of ['../part-1.html', '/part-1.html', 'nested/part.html', 'a\\b.html', 'part.txt', '.hidden.html']) {
      f.write([{ ...entry, sourceFile }])
      assert.throws(() => f.render(), /Invalid editorial source filename/)
      assert.equal(readFileSync(f.destination, 'utf8'), html)
    }
  } finally { f.clean() }
})

test('duplicate IDs or slugs reject the complete inventory before any draft cleanup', () => {
  const f = fixture()
  try {
    f.render(true)
    f.write([entry, { ...entry, slug: 'other' }])
    assert.throws(() => f.render(), /Duplicate editorial newsId/)
    assert.equal(readFileSync(f.destination, 'utf8'), html)
    f.write([entry, { ...entry, newsId: 'other' }])
    assert.throws(() => f.render(), /Duplicate editorial slug/)
    assert.equal(readFileSync(f.destination, 'utf8'), html)
  } finally { f.clean() }
})

test('entries require an existing unique Editorial record, explicit review state, and reader file', () => {
  const f = fixture()
  try {
    for (const news of [[], [{ id: entry.newsId, contentType: 'news' }], [
      { id: entry.newsId, contentType: 'editorial' }, { id: entry.newsId, contentType: 'editorial' },
    ]]) {
      f.write([entry], news)
      assert.throws(() => f.render(), /exactly one Editorial News record/)
    }
    f.write([entry], [{ id: entry.newsId, contentType: 'editorial' }])
    assert.throws(() => f.render(), /explicit reviewStatus/)
    f.write([{ ...entry, sourceFile: 'missing.html' }])
    assert.throws(() => f.render(), /Missing editorial HTML file/)
    f.write({ entries: [entry] })
    assert.throws(() => f.render(), /index must contain an array/)
    f.write([entry], { items: [] })
    assert.throws(() => f.render(), /News YAML must contain an array/)
    assert.equal(existsSync(f.destination), false)
  } finally { f.clean() }
})

test('symlinked sources and destinations cannot read or overwrite outside managed paths', () => {
  const f = fixture()
  try {
    const target = join(f.outputDir, 'outside.html')
    mkdirSync(f.outputDir)
    writeFileSync(target, 'preserve outside content')
    symlinkSync(target, join(f.sourceDir, 'linked.html'))
    f.write([{ ...entry, sourceFile: 'linked.html' }])
    assert.throws(() => f.render(true), /Missing editorial HTML file/)
    f.write()
    mkdirSync(join(f.outputDir, 'editorials'))
    symlinkSync(f.outputDir, join(f.outputDir, 'editorials', entry.slug))
    assert.throws(() => f.render(true), /must not be a symlink/)
    assert.equal(readFileSync(target, 'utf8'), 'preserve outside content')
  } finally { f.clean() }
})
