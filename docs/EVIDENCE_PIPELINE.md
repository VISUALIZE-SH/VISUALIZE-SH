# Evidence pipeline

The evidence pipeline compiles a bounded, human-authored YAML collection into the public intelligence payload and can capture review-only changes from two official APIs. It does not publish news, update curated YAML, monitor continuously, or schedule itself.

## Curated data build

The default build reads `data/intelligence/pilot.yaml` and
`data/intelligence/comparative-pilot.yaml`, validates them against their JSON
schemas, performs semantic cross-record checks, and writes deterministic JSON to
`public/intelligence.json`:

```sh
node --import tsx scripts/build-intelligence.ts
```

Paths are configurable for tests and one-off validation:

```sh
node --import tsx scripts/build-intelligence.ts \
  --input data/intelligence/pilot.yaml \
  --comparative data/intelligence/comparative-pilot.yaml \
  --output /tmp/intelligence.json \
  --schema schema/intelligence.schema.json \
  --legacy-data data \
  --graph public/graph.json
```

The compiler sorts identified record arrays and object keys before serialization. If the serialized result is unchanged, it leaves the existing output untouched. It validates:

- schema shape, enums, HTTPS source URLs, explicit date precision, and exact missingness states;
- unique identities and source references with non-empty document locators;
- product-family, version, decision, indication, trial, cohort, readout, endpoint, outcome, event, and legacy graph cross-references;
- jurisdiction agreement and acyclic indication supersession;
- exact, mixed, and unresolved version mapping without inventing an exact generation;
- trial/cohort/readout and cohort-arm consistency;
- target versus actual enrollment wording;
- one-sided versus two-sided confidence bounds;
- acyclic documented design ancestry. `predicate_for` is retained as a regulatory comparison and is never traversed as ancestry.

`0` remains a valid reported numeric value. Missing values omit `value` and use one of `not_publicly_disclosed`, `not_yet_reviewed`, `not_applicable`, or `conflicting`; the compiler rejects a hidden value on those states.

## Local evidence snapshots

The snapshot command supports only FDA PMA and ClinicalTrials.gov. Without `--fetch`, it uses clearly synthetic local fixtures and performs no network access:

```sh
node --import tsx scripts/snapshot-evidence.ts --source fda-pma --id P999999S001
node --import tsx scripts/snapshot-evidence.ts --source ctgov --id NCT99999999
```

Use a specific local response with `--fixture path/to/response.json`. Use `--retrieved-at` to make a replay's acquisition time explicit. The default outputs are:

- immutable snapshots: `artifacts/evidence/snapshots/<source>/<IDENTIFIER>/<sha256>.json`
- draft queue: `artifacts/evidence/review-queue.json`

The SHA-256 digest is calculated from canonical JSON response content, independent of object key order. A repeated response reuses the content-addressed snapshot and adds no proposal. A changed response is normalized to a small set of decision or study fields, compared with the latest prior snapshot, and added once to the queue with `status: DRAFT` and `kind: normalized_api_change`. Changes are field-level paths such as `$.enrollment.count`; additions and removals retain an explicit `after` or `before` value. Raw responses and prior snapshots remain intact.

The queue is a discovery aid. A reviewer must confirm the official detail page and supporting decision, label, SSED, protocol, or results document before editing curated intelligence or creating news. The command refuses YAML and news queue targets.

## Explicit official API reads

Network access occurs only when `--fetch` is present:

```sh
node --import tsx scripts/snapshot-evidence.ts --source fda-pma --id P140031S010 --fetch
node --import tsx scripts/snapshot-evidence.ts --source ctgov --id NCT03904147 --fetch
```

Fetch mode issues credential-free `GET` requests only to these allowlisted endpoints:

- `https://api.fda.gov/device/pma.json`
- `https://clinicaltrials.gov/api/v2/studies/<NCT_ID>`

Redirects are rejected, responses are capped at 5 MB, and requests time out after 20 seconds. The FDA API is a discovery source; reconcile a candidate against the decision-specific FDA page and posted documents. ClinicalTrials.gov provides current registry state, so each retrieval is stored as a dated local observation rather than treated as a complete revision history.

There is intentionally no live monitor or schedule. Run the command manually or from a separately reviewed workflow when a bounded source needs checking.

## Already-downloaded public documents

Decision PDFs and other public FDA or ClinicalTrials.gov documents can change independently of normalized API metadata. Capture a local file with its explicit official source URL:

```sh
node --import tsx scripts/snapshot-document.ts \
  --id P140031S010-order \
  --source-url https://www.accessdata.fda.gov/cdrh_docs/example.pdf \
  --file /path/to/already-downloaded-public-document.pdf
```

This command never fetches. It accepts a regular local PDF, HTML, JSON, XML, or text file only when the source URL is public HTTPS on an allowlisted FDA or ClinicalTrials.gov host. It stores the original bytes and immutable acquisition metadata under `artifacts/evidence/snapshots/documents/<IDENTIFIER>/`, keyed by the file's SHA-256 digest.

When bytes change, both versions remain available and the shared queue receives one `DRAFT` proposal with `kind: document_content_changed`, the prior and current hashes, and a manual-review instruction. It deliberately emits no field or clinical semantic diff. A reviewer must compare the retained files and identify whether the change is substantive. Identical reruns create neither another snapshot nor another proposal. Licensed or private source URLs are rejected, and there is no `--fetch` mode.

`npm run review:prepare` includes both API and document proposal kinds in the local evidence review packet without applying either kind.

## Verification

Run the focused suite and script typecheck with:

```sh
node --import tsx --test scripts/intelligence-validation.test.ts scripts/intelligence-snapshot.test.ts
npm run typecheck:scripts
node --import tsx scripts/build-intelligence.ts --output /tmp/visualize-sh-intelligence.json
```

Recommended package scripts are:

```json
{
  "build:intelligence": "node --import tsx scripts/build-intelligence.ts",
  "test:intelligence": "node --import tsx --test scripts/intelligence*.test.ts",
  "evidence:snapshot": "node --import tsx scripts/snapshot-evidence.ts",
  "evidence:snapshot-document": "node --import tsx scripts/snapshot-document.ts"
}
```

The application build should run `build:intelligence` before TypeScript/Vite so `public/intelligence.json` always reflects the reviewed YAML input.

## Official-document media workflow

`media` is an optional top-level collection while the public-document visual library is introduced. An `EvidenceMedia` record is not a generic product image: it is a locally served rendition of a specifically cited page, figure, diagram, or workflow from an official public document. Each record carries its own ID, one or more explicit `versionIds`, a placement panel (`design`, `fit`, `function`, `action`, or `workflow`), title, caption, descriptive alt text, root-relative `/evidence/...` asset path, source locator(s), and review state. Optional `page`, `figure`, and normalized `crop` metadata preserve how the rendition was made.

Use this deliberate sequence before adding a media record:

1. Retrieve the official public PDF from its canonical regulatory or manufacturer URL and create an immutable local snapshot with its retrieval metadata and SHA-256 digest. Do not use screenshots from search results, marketing reposts, or an untracked browser download.
2. Confirm the document/version identity, then render the cited PDF page at reviewable resolution. Visually verify the page number, figure label, configuration, and surrounding explanatory text against the immutable original.
3. Crop only the necessary page region. Preserve the uncropped page rendering during review, record the normalized crop coordinates when a crop is used, and write a precise source locator such as `p. 4, Fig. 2` in `sourceRefs`.
4. Save the approved derivative beneath `public/evidence/` so its data record can use a safe `/evidence/...` asset path. Keep images as faithful document renditions; do not redraw, recolor, or imply a configuration not shown in the source.
5. Add the cited record as `draft`, review the rendered Atlas/Data Explorer card for legibility, source link, caption, and alt text, then promote it to `reviewed` only after a second visual/provenance check.

The validator rejects remote URLs, traversal paths, non-image assets, missing source locators, dangling version references, and crop bounds outside the source page. Atlas and Data Explorer render these galleries only when matching media records exist, so an unfinished media library creates no empty destination or placeholder gallery.
