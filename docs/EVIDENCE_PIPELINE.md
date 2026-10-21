# Evidence pipeline

The evidence pipeline compiles a bounded, human-authored YAML collection into the public intelligence payload. It does not publish news, update curated YAML, monitor continuously, or schedule itself. Evidence gathering, source snapshots, and monitoring happen in the owner's private research engine, not in this repository.

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

## Export intake

An approved export bundle from the private research engine reaches this repository as additions to the authored YAML: news items, graph entities, source-scoped relationships, and new `data/intelligence/catalog/<topic>.yaml` fragments. On the owner machine the engine (checked out at `discovery-engine/`, ignored by this repository's Git) writes the records into the checkout uncommitted, and refuses a dirty tree. Intake then follows the normal path: rebuild the payloads, review the YAML and generated JSON diff against [the source policy](SOURCE_CURATION_POLICY.md), and commit through a reviewed pull request.

Intake does not approve publication. Each record arrives with the review state its bundle assigns, draft records stay draft until curator review, and a later source change opens a review task rather than silently updating an approved fact. Raw responses, document snapshots, review queues, and licensed text stay in the engine and out of Git.

## Verification

Run the focused suite and script typecheck with:

```sh
node --import tsx --test scripts/intelligence-validation.test.ts
npm run typecheck:scripts
node --import tsx scripts/build-intelligence.ts --output /tmp/visualize-sh-intelligence.json
```

Recommended package scripts are:

```json
{
  "build:intelligence": "node --import tsx scripts/build-intelligence.ts",
  "test:intelligence": "node --import tsx --test scripts/intelligence*.test.ts"
}
```

The application build should run `build:intelligence` before TypeScript/Vite so `public/intelligence.json` always reflects the reviewed YAML input.

## Official-document media workflow

`media` is an optional top-level collection while the public-document visual library is introduced. An `EvidenceMedia` record is not a generic product image: it is a locally served rendition of a specifically cited page, figure, diagram, or workflow from an official public document. Each record carries its own ID, one or more explicit `versionIds`, a placement panel (`design`, `fit`, `function`, `action`, or `workflow`), title, caption, descriptive alt text, root-relative `/evidence/...` asset path, source locator(s), and review state. Optional `page`, `figure`, and normalized `crop` metadata preserve how the rendition was made.

Use this deliberate sequence before adding a media record:

1. Prefer exact-version FDA-submitted content; confirm its reuse basis before extraction. If no suitable reusable FDA figure is available, use an eligible commercially reusable publication under [the source policy](SOURCE_CURATION_POLICY.md). Retrieve the canonical PDF or publisher/repository figure and preserve an ignored local snapshot with retrieval metadata and SHA-256 digest. Do not use screenshots from search results, marketing reposts, or an untracked browser download.
2. Confirm the document/version identity, then render the cited PDF page or inspect the original figure image at reviewable resolution. Visually verify the page number, figure label, configuration, and surrounding explanatory text against the immutable original.
3. Crop only the necessary page or original figure region. Preserve the uncropped rendering during review, record the normalized crop coordinates and their reference canvas, and write a precise source locator such as `p. 4, Fig. 2` in `sourceRefs`. Retain source and license links, original credits, and a description of modifications in the caption and source-linked curation notes.
4. Save the approved derivative beneath `public/evidence/` so its data record can use a safe `/evidence/...` asset path. Keep images as faithful document renditions; do not redraw, recolor, or imply a configuration not shown in the source.
5. Add the cited record as `draft`, review the rendered Atlas/Data Explorer card for legibility, source link, caption, and alt text, then promote it to `reviewed` only after a second visual/provenance check.

The validator rejects remote URLs, traversal paths, non-image assets, missing source locators, dangling version references, and crop bounds outside the source page or original figure image specified by the locator. Atlas and Data Explorer render these galleries only when matching media records exist, so an unfinished media library creates no empty destination or placeholder gallery. The [LAAO image curation notes](LAAO_DEVICE_IMAGE_CURATION.md) record the commercial-reuse assessment, FDA alternatives, and crop details for that collection.
