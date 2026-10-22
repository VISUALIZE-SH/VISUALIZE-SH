# VISUALIZE·SH developer guide

How the app is built, where its data lives, how to change it safely, and how it
ships. For what the site is and how readers use it, see the [README](../README.md).

## Contents

1. [Requirements and quick start](#1-requirements-and-quick-start)
2. [Scripts](#2-scripts)
3. [Architecture](#3-architecture)
4. [Data files and schemas](#4-data-files-and-schemas)
5. [Factual data intake and review](#5-factual-data-intake-and-review)
6. [Design system](#6-design-system)
7. [Project layout](#7-project-layout)
8. [Configuration and deployment](#8-configuration-and-deployment)
9. [Security and privacy](#9-security-and-privacy)
10. [Contributing](#10-contributing)

## 1. Requirements and quick start

Node 20.19+ or 22.12+ (GitHub Actions uses Node 22).

```bash
npm ci
npm run dev          # builds data, then starts Vite at http://localhost:5173
```

Before changing anything, read [`AGENTS.md`](../AGENTS.md) (contributor and agent
rules), [`docs/HANDOFF.md`](HANDOFF.md) (source-of-truth map and local verification
path) and [`docs/SOURCE_CURATION_POLICY.md`](SOURCE_CURATION_POLICY.md) (what a
factual record must carry to be merged). Inspect `git status --short` first; a
checkout may hold uncommitted work.

## 2. Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `npm run serve` | Build data, start the Vite dev server |
| `npm run build:graph` | Validate graph and news YAML, write `public/graph.json` |
| `npm run build:intelligence` | Validate the evidence catalog, write `public/intelligence.json` |
| `npm run build:data` | Both of the above |
| `npm run build` | `build:data`, app typecheck, production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` / `typecheck:scripts` | App / script TypeScript checks |
| `npm test` | Unit tests |
| `npm run validate:local` | Data build, both typechecks, tests, security scan, newsletter preflight |
| `npm run security:check` | Secrets, email/PII and tracking scan of tracked files |
| `npm run newsletter:review -- --date YYYY-MM-DD` | Validated local draft previews of the digest |
| `npm run newsletter:render -- --date YYYY-MM-DD` | Public and email-safe digest HTML |
| `npm run newsletter:delivery:check -- --date YYYY-MM-DD` | Compare deployed email HTML byte for byte |
| `npm run newsletter:local [-- --dry-run]` | Local draft-review previews only |

Substantial app or data changes need `npm run validate:local` and
`VITE_BASE=/ npm run build`; documentation-only changes need a link/content review
and `git diff --check`.

## 3. Architecture

```text
data/*.yaml ──(build:graph)──────────────────────► public/graph.json ──► Atlas graph overview
data/intelligence/{pilot,taxonomy,comparative-pilot}.yaml
  + data/intelligence/catalog/*.yaml ──(build:intelligence)──► public/intelligence.json ──► News / Atlas / Data
data/news.yaml ──────────────────────────────────► graph news + digest HTML
```

- **Source of truth** is the YAML under `data/`, one file per entity type; entities
  reference each other by `id`.
- `scripts/build-data.ts` validates every entity against `schema/*.schema.json`,
  checks referential integrity (including trial cross-checks in
  `scripts/trial-validation.ts`), derives graph edges and writes `public/graph.json`.
  Generated payloads are committed so the site needs no server.
- `scripts/build-intelligence.ts` validates the versioned evidence records
  (claims, events, readouts, outcomes with review status and explicit missingness)
  and writes `public/intelligence.json`.
- **Workspaces.** News, Atlas and Data share version context through URL state, for
  example `?mode=atlas&version=ver-feops-heartguide` or
  `?mode=data&version=ver-feops-heartguide`. Therapy profiles and Data cards share a
  consolidated **Evidence** section; **Export References** downloads APA HTML.
  Patents appear only with an explicit public product-to-patent connection
  ([`docs/REFERENCE_BIBLIOGRAPHY.md`](REFERENCE_BIBLIOGRAPHY.md)).
- **Data Browse/Compare.** One spec table per device or drug class (rows are
  products, columns are the class's standard attributes plus first US approval),
  with Outcomes, History and Figures tabs; Compare aligns two to four exact
  versions. Column order and evidence date live in the URL; rows export to CSV or
  JSON with source locators and gap states.
- **Graph rendering** (Cytoscape.js): color/shape encode entity type, node size
  encodes connectedness, label size encodes `pulse` (recent news attention, 0–10),
  and a dashed outline marks draft records. Layout helpers in `src/graph/`:
  `elasticPull.ts` (d3-force spring on drag), `clusterByCondition.ts` (islands
  around condition anchors), `declutter.ts` (label-aware collision pass with a
  simplex-noise warp), `layouts.ts` (clustered overview and timeline).
- **Bundle.** Vite splits vendor chunks (`react`, `cytoscape`, `force`) and lazily
  loads workspace views and the graph canvas (`vite.config.ts`). Vite scans only
  `index.html` for dependencies.

More: [`docs/ARCHITECTURE.md`](ARCHITECTURE.md),
[`docs/COMPARATIVE_DATA_MODEL.md`](COMPARATIVE_DATA_MODEL.md),
[`docs/EVIDENCE_PIPELINE.md`](EVIDENCE_PIPELINE.md).

## 4. Data files and schemas

| File | Contents | Schema |
| --- | --- | --- |
| `data/conditions.yaml` | Conditions and anatomy (`cond-*`) | `schema/condition.schema.json` |
| `data/therapies.yaml` | Devices, drugs, digital therapies, procedures (`dev-*`, `rx-*`, `dig-*`, `proc-*`) | `schema/therapy.schema.json` |
| `data/companies.yaml` | Companies (`co-*`) | `schema/company.schema.json` |
| `data/trials.yaml` | Clinical trials (`trial-*`) | `schema/trial.schema.json` |
| `data/relationships.yaml` | Typed edges with locators (`rel-*`) | `schema/relationship.schema.json` |
| `data/news.yaml` | Source-linked news, newest first, ≤ 250 items, immutable `news-YYYY-MM-DD-*` ids | `schema/news.schema.json` |
| `data/intelligence/` | Evidence catalog: `pilot.yaml`, `taxonomy.yaml`, `catalog/<topic>.yaml` fragments, `citations.yaml` | `schema/intelligence.schema.json` |

The field contract, id conventions and rules are in
[`schema/DATA_DICTIONARY.md`](../schema/DATA_DICTIONARY.md). Highlights:

- Every factual record carries `curation` (`status: draft | curated`, `lastUpdated`,
  `sources`, optional `notes`). Drafts render with a dashed outline and "Draft"
  label until a curator promotes them.
- Trials: `status` is the registry's own overall status (including
  `not-yet-recruiting`); `primaryAnalysis` records whether results are reported;
  `enrollmentCounts` types each count (estimated, actual, randomized, analyzed,
  treated) with a source. The legacy `enrollment` integer remains.
- Unknown values stay explicit; never transfer a fact across product generations,
  cohorts, jurisdictions or indications without evidence.
- Catalog fragments: see [`data/intelligence/catalog/README.md`](../data/intelligence/catalog/README.md);
  each spec value compiles to a draft, source-located claim.

Edit authored YAML, schemas, validators and types together, then regenerate the
payloads with `npm run build:data`.

## 5. Factual data intake and review

Research does not run in this repository. New and updated factual records arrive
as reviewed export bundles from the owner's private research engine: the owner
approves records there, the engine writes them into this checkout uncommitted and
runs `validate:local` and the build, and they reach `main` through a pull request
that carries the Linear issue id. Review a data PR against
[`docs/SOURCE_CURATION_POLICY.md`](SOURCE_CURATION_POLICY.md); corrections go back
to the engine rather than being edited here. When several import PRs build on each
other they are stacked: merge in order, retargeting the next PR to `main` before
deleting the merged branch.

Newsletter selection, rendering, delivery checks and Zoho steps follow
[`docs/LOCAL_NEWSLETTER_WORKFLOW.md`](LOCAL_NEWSLETTER_WORKFLOW.md); News Insights
drafting and rendering follow [`prompts/news-insights.md`](../prompts/news-insights.md)
and [`docs/NEWS_INSIGHTS_WORKFLOW.md`](NEWS_INSIGHTS_WORKFLOW.md). Publication and
delivery each need separate owner approval.

## 6. Design system

[`DESIGN.md`](../DESIGN.md) documents the tokens, type scale and palette. UI chrome
reads from design tokens in `src/index.css` (`:root`, plus `[data-theme='dark']`);
the categorical node palette is in `src/graph/palette.ts`. Type: Open Sans for
headings and the wordmark (light "VISUALIZE", semibold "·SH"), Source Sans 3 for
body text. The README logo is generated from `public/favicon.svg` and the Open Sans
glyphs as paths: `docs/assets/visualize-sh-wordmark-{light,dark}.svg`.

## 7. Project layout

```text
data/        YAML source of truth (graph entities, news, evidence catalog)
schema/      JSON Schemas and DATA_DICTIONARY.md
scripts/     builds, validators, audits, newsletter, News Insights, Zoho tools
public/      graph.json, intelligence.json, digests and published pages (generated)
prompts/     News Insights drafting template
docs/        handoff, architecture, curation policy, operations, plans
DESIGN.md    design system
src/
  graph/       Cytoscape setup, styles, layouts, palette, force helpers
  components/  workspaces, graph canvas, header, filters, detail panel, about
  data/        payload loading, comparison projection, URL workspace state
  types/       graph, intelligence and comparative data contracts
```

## 8. Configuration and deployment

- Pushing to `main` builds and deploys to GitHub Pages via
  [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) (enable
  **Settings → Pages → Source: GitHub Actions** once). The custom domain is in
  `public/CNAME`.
- Production serves from `/` (`VITE_BASE=/`); one-off builds without `VITE_BASE`
  fall back to the GitHub Pages project path ([`vite.config.ts`](../vite.config.ts)).
- Repository variable `NEWSLETTER_SIGNUP_URL` points the Newsletter link at the
  hosted Zoho form.
- `main` is protected: required checks `repository-checks`, `dependency-review` and
  `codeql`, branches must be up to date, no force-push or deletion; auto-merge is
  disabled. Code owners are listed in `.github/CODEOWNERS`.
- `.env.example` documents local-only variables; `.env` is never committed.

## 9. Security and privacy

- The app has no analytics, advertising pixels, tracking cookies or tracking
  storage; `localStorage` only remembers the selected color theme.
- A strict Content Security Policy in `index.html` limits scripts to the site's own
  origin and styles/fonts to the site and Google Fonts.
- `npm run security:check` (also in CI) rejects secrets, unapproved email addresses
  and tracking APIs in tracked files.
- Never commit credentials, subscriber data, private watchlists, licensed full text
  or raw research evidence. Subscriber addresses stay in Zoho.
- See [`SECURITY.md`](../SECURITY.md), [`docs/SECURITY_REVIEW.md`](SECURITY_REVIEW.md),
  [`PRIVACY.md`](../PRIVACY.md) and the
  [published privacy notice](https://visualize-sh.com/privacy.html).

## 10. Contributing

- Track work in Linear per [`docs/LINEAR_WORKFLOW.md`](LINEAR_WORKFLOW.md); branches
  are named `codex/wor-<number>-<short-slug>` and PR descriptions carry the issue id.
- Keep changes focused; run the checks in [§2](#2-scripts) before opening a PR.
- Factual changes follow [§5](#5-factual-data-intake-and-review), not direct edits.
