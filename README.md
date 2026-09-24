# VISUALIZE-SH

An interactive, front-end-only **knowledge graph of the structural heart
landscape** — valvular and non-valvular — covering conditions and anatomy, the
therapies that target them (devices, pharmaceuticals, digital therapeutics,
procedures), the companies behind them, and the clinical trials that evaluate them.

Built with React + TypeScript + Vite + [Cytoscape.js](https://js.cytoscape.org/).
The data is hand-curated YAML, validated and compiled into a static graph and
source-linked news feed — so the whole thing deploys as plain static files and is
easy to keep up to date.

VISUALIZE-SH now has three connected workspaces around that retained graph:
**News** explains what changed, **Atlas** shows how a product or therapy fits and
evolves, and **Data** lets readers inspect the source-linked evidence behind a
comparison. The graph remains the overview and navigation surface. Versioned
evidence is loaded from the static `public/intelligence.json` payload.

> ⚕️ **This is not a clinical advice tool.** Content here is not provided or
> endorsed by the organizations listed. For educational and informational use
> only. This is not medical advice and may be incomplete or out of date.
> Regulatory status, trial results, and corporate ownership change frequently —
> always verify against primary sources (FDA labeling, ClinicalTrials.gov,
> peer-reviewed publications) before relying on anything here.

## Quick start

```bash
npm ci
npm run dev          # builds data, then starts Vite at http://localhost:5173
```

New collaborators should read **[`docs/HANDOFF.md`](docs/HANDOFF.md)** for the
source-of-truth map, review boundaries, and a complete local verification path.
The current checkout may contain uncommitted work; inspect `git status --short`
before changing files.

Other scripts:

```bash
npm run build:graph  # validate graph/news YAML -> public/graph.json
npm run build:data   # build both graph.json and intelligence.json
npm run build        # build:data + app typecheck + production build to dist/
npm run preview      # serve the production build locally
npm run typecheck    # app TypeScript only
npm run validate:local # both typechecks, tests, security scan, and newsletter preflight
npm run newsletter:render -- --date YYYY-MM-DD  # public + email-safe weekly HTML
npm run test:newsletter                        # newsletter unit tests
npm run security:check                         # secrets, email/PII, tracking scan
npm run build:intelligence                     # validate pilot -> public/intelligence.json
npm run newsletter:local                       # local DRAFT REVIEW previews only
npm run newsletter:local -- --dry-run          # no-write local preflight
npm run review:prepare                         # assemble a local review packet
npm run evidence:snapshot -- --help            # bounded official-source snapshot CLI
npm run evidence:snapshot-document -- --help   # local document snapshot CLI
```

## How it works

```
data/*.yaml  ──(build:graph)──────────────►  public/graph.json ───► retained graph overview
data/intelligence/{pilot,taxonomy,comparative-pilot}.yaml + catalog/*.yaml ─(build:intelligence)─► public/intelligence.json ─► News / Atlas / Data
data/news.yaml  ─────────────────────────► graph.news + weekly digest HTML
```

- **Source of truth** is the YAML in `data/` (one file per entity type). Entities
  reference each other by `id`.
- `scripts/build-data.ts` validates every entity against `schema/*.schema.json`,
  checks referential integrity, derives the graph edges, and writes
  `public/graph.json` (committed, so no server is needed).
- `data/news.yaml` holds the weekly source-linked digest. Every story names the
  existing graph nodes it concerns; selecting it focuses those nodes, and the
  same story appears in each linked node's detail panel.
- `data/intelligence/pilot.yaml` holds versioned, source-located evidence records.
  Claims, events, readouts, and outcomes retain review status and explicit
  missingness; `scripts/build-intelligence.ts` validates cross-record references
  before writing the static payload.
- `data/intelligence/taxonomy.yaml` defines device/drug classes and their standard
  attributes. `data/intelligence/catalog/*.yaml` adds products, FDA decisions, and
  compact spec values per class (see `data/intelligence/catalog/README.md`); each
  value compiles to a draft, source-located claim.
- News, Atlas, and Data share version context through links such as
  `?mode=atlas&version=ver-feops-heartguide` and
  `?mode=data&version=ver-feops-heartguide`. The original graph remains available
  as the overview and legacy crosswalk.
- Data **Browse** shows one spec table per device or drug class (one row per
  product, one column per standard attribute, plus the first US approval), with
  Outcomes, History, and Figures tabs. Selecting a product or value opens its
  sources and context. **Compare** aligns two to four exact versions in a class. Column order and evidence date are shareable in
  the URL; visible rows export to CSV or JSON with source locators and gap states.
  The pilot also offers exact-size SAPIEN 3 and Evolut FX configuration selectors,
  with source-located annulus sizing and Evolut FX delivery capsule measurements.
  These observations remain unreviewed; missing sizes, metrics, and clinical
  outcomes stay explicit gaps. Available source figures appear in both views.
- The app loads `graph.json` and renders it. Color/shape encode entity type, node
  size encodes connectedness, **label size encodes `pulse`** (recent news
  attention, 0–10), and a dashed outline marks uncurated **drafts**. Labels scale
  with zoom and auto-hide when too small, so the highest-pulse topics surface
  first on the overview.
- **Elastic pull:** dragging a node runs a small [`d3-force`](https://github.com/d3/d3-force)
  spring simulation ([`src/graph/elasticPull.ts`](src/graph/elasticPull.ts)) so the
  neighbors are pulled along, with the effect falling off across the network.
- **Condition-anchored clustering:** after the clustered layout, a `d3-force` pass
  ([`src/graph/clusterByCondition.ts`](src/graph/clusterByCondition.ts)) gathers each
  node into an island around the disease state(s) it connects to. The condition nodes
  are pinned anchors (spread apart once so islands have room between them); every other
  node is pulled toward the weighted centroid of the conditions it reaches within a few
  hops. Single-condition nodes pull in tight; nodes shared across conditions pull weakly
  and linger in the space between islands.
- **Label-aware de-clutter:** after every layout, a short `d3-force` collision pass
  ([`src/graph/declutter.ts`](src/graph/declutter.ts)) separates nodes by their
  *label-inclusive* footprint (so big-`pulse` labels don't cover neighboring icons),
  while gently holding the layout's structure. Re-runs once web fonts load so label
  sizes are measured correctly. The same pass adds a coherent
  [`simplex-noise`](https://github.com/jwagner/simplex-noise.js) displacement field
  (an organic, non-grid warp where neighbors drift together) and pushes disconnected
  components apart so isolated islands read as isolated.
- **Lean initial load:** Vite splits the bundle into vendor chunks (`react`,
  `cytoscape`, `force`) and lazily loads workspace views and the graph canvas.
  The Atlas graph offers a clustered overview and timeline (see
  [`layouts.ts`](src/graph/layouts.ts) and [`vite.config.ts`](vite.config.ts)).

## Updating the data

Read **[`schema/DATA_DICTIONARY.md`](schema/DATA_DICTIONARY.md)** — it documents
every field, the id conventions, and the rules. The short version:

1. Edit the YAML in `data/` (add entities as `curation.status: draft` with
   `sources`; add source-linked stories to `data/news.yaml`).
2. `npm run build:data` — must pass (it fails on bad data or dangling references).
3. Review drafts in the app, promote to `curated`, commit, and deploy.

For versioned evidence, run `npm run build:intelligence` and inspect the generated
`public/intelligence.json`. Use `npm run review:prepare` to collect draft records,
source changes, missing fields, unresolved mappings, and weekly proposals into a
local review packet. Use `npm run newsletter:local` for the two local-only flagship
previews; these remain outside `public/digests/` and are never sendable while
their records are draft. See [`docs/LOCAL_IMPLEMENTATION_STATUS.md`](docs/LOCAL_IMPLEMENTATION_STATUS.md),
[`docs/EVIDENCE_PIPELINE.md`](docs/EVIDENCE_PIPELINE.md), and
[`docs/NEWSLETTER_LOCAL_READINESS.md`](docs/NEWSLETTER_LOCAL_READINESS.md).
For ownership boundaries and the end-to-end runtime/research flow, see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

The cloud workflow researches a weekly evidence window, prepares a review PR,
publishes approved HTML, and delivers it through Zoho Campaigns without touching a
local clone. See **[`docs/CLOUD_WORKFLOW.md`](docs/CLOUD_WORKFLOW.md)** and
**[`docs/ZOHO_CAMPAIGNS_SETUP.md`](docs/ZOHO_CAMPAIGNS_SETUP.md)**. The final
threat review and rollout gate are in
**[`docs/SECURITY_REVIEW.md`](docs/SECURITY_REVIEW.md)**. `ROUTINE.md` is retained
as the legacy local-task contract until cloud cutover is verified.

## Design system

The visual language (Source Sans Pro type, deep-purple brand, vivid-violet links)
is derived from [harshadparanjape.com](https://www.harshadparanjape.com/) and
documented in **[`DESIGN.md`](DESIGN.md)**. All UI chrome reads from design tokens
in `src/index.css` (`:root`); the categorical node palette lives in
`src/graph/palette.ts`.

## Project layout

```
data/        YAML source of truth (legacy graph, news, and intelligence pilot)
schema/      JSON Schemas + DATA_DICTIONARY.md
scripts/     validation, evidence snapshots, review packets, digests, and Zoho tools
public/      graph.json + intelligence.json + public digest/preview HTML (generated)
prompts/     bounded weekly research contract
docs/        handoff guide, architecture, evidence rules, operations, and plans
DESIGN.md    design system (tokens, type scale, palette)
src/
  graph/     Cytoscape setup, styles, layouts, palette, elasticPull, clusterByCondition, declutter
  components/ GraphCanvas, Header, Filters, DetailPanel, SearchBar, Legend, About
  data/      payload loading, comparison projection, and URL workspace state
  types/     graph, intelligence, and comparative data contracts
```

## Deployment

Pushing to `main` builds and deploys to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). To turn it on,
enable **Settings → Pages → Source: GitHub Actions** once.

The production workflow serves the configured custom domain from `/`; one-off
production builds fall back to the GitHub Pages project path when `VITE_BASE` is
unset (see [`vite.config.ts`](vite.config.ts)). Set the public repository variable
`NEWSLETTER_SIGNUP_URL` to the hosted Zoho form URL to activate the Newsletter
signup link in the deployed client.

## Privacy and security

The app uses no analytics, advertising pixels, tracking cookies, or tracking
storage. It uses `localStorage` only to remember the visitor's selected color
theme. Newsletter signup opens Zoho's separately hosted consent form;
subscriber addresses remain in Zoho and never enter the repository. See
[`PRIVACY.md`](PRIVACY.md), the
[published privacy notice](https://visualize-sh.com/privacy.html), and
[`SECURITY.md`](SECURITY.md).
