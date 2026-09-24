# VISUALIZE-SH architecture

VISUALIZE-SH is a static React application with two related data layers. The
legacy graph is the broad landscape and navigation crosswalk; the versioned
intelligence payload is the source-located evidence layer used by News, Atlas,
and Data. Keeping those responsibilities separate prevents a broad therapy node
from silently inheriting a claim that applies only to one model, software build,
study cohort, or regulatory decision.

## Runtime flow

```text
data/*.yaml ── build:graph ──> public/graph.json ──> relationship graph + news
data/intelligence/{pilot,taxonomy,comparative-pilot}.yaml + catalog/*.yaml
           └─ build:intelligence ─> public/intelligence.json ─> profiles + evidence

URL workspace state ─> App orchestration ─> News | Atlas | Data
system theme + saved override ─────────────> DOM tokens + Cytoscape stylesheet
```

`src/App.tsx` is the composition root. It loads both static payloads, owns URL
workspace state, shares product/condition context across modes, and coordinates
graph selection. It should not acquire evidence or contain record-specific
presentation logic.

- `src/data/workspace-state.ts` is the only URL parse/serialize boundary. New
  shareable filters belong there and need round-trip tests.
- `src/theme.ts` owns System/Light/Dark resolution. CSS consumes semantic tokens;
  Cytoscape receives the resolved theme because canvas styles cannot read CSS
  custom properties reliably.
- `src/components/intelligence/NewsWorkspace.tsx` presents authored summaries and
  citations. It links to Atlas context but does not infer clinical facts.
- `src/components/intelligence/ProfileCatalog.tsx` exposes the full graph therapy
  landscape while distinguishing deep evidence profiles from graph-only entries.
- `src/components/intelligence/AtlasEvidence.tsx` provides a readable product
  narrative: design, fit, function/action, evidence, and dated change history.
- `src/components/intelligence/DataWorkspace.tsx` shows Browse as Specs,
  Outcomes, History, and Figures tabs and delegates Compare to
  `ComparisonView.tsx`. `src/data/spec-tables.ts` groups versions into one table
  per comparison category (first category wins; uncategorized versions share an
  "Other" table) and `SpecTables.tsx` renders them with expandable source rows.
- `scripts/intelligence/catalog.ts` merges `taxonomy.yaml` and
  `catalog/*.yaml` into the pilot before validation, expanding compact `specs`
  into ordinary draft claims. Unpopulated categories are pruned.
- `src/data/comparison.ts` projects authored category membership and standard
  attributes into ordered cells. Exact-size observations come from
  `data/intelligence/comparative-pilot.yaml` when the reader selects a curated
  configuration. The projection preserves method, source, review, and
  comparability state for display and export; uncurated cells remain gaps.
- `src/graph/` owns Cytoscape layout, styling, clustering, and interaction. Graph
  rendering may highlight relationships; it must not manufacture evidence.

## Build and validation boundaries

`scripts/build-data.ts` validates the broad entity YAML and compiles graph nodes,
edges, metadata, and the chronological news feed. `scripts/build-intelligence.ts`
validates the evidence and comparative schemas plus semantic cross-references
before producing a deterministically ordered payload. Every comparative
configuration must resolve to an exact version and match its family and name.
Generated JSON is committed because the deployed site has no application server.

The intelligence validator intentionally checks more than JSON shape: sources,
versions, cohorts, arms, decisions, lineage, dates, and missingness must agree.
Add a semantic rule when a structurally valid record could still make an unsafe
or misleading association.

## Research and review boundaries

The weekly Codex task researches in the saved local project. It reads the private
watchlist from ignored `artifacts/research/`, updates `data/news.yaml` with draft
items, and builds ignored newsletter review previews. Draft news is excluded from
the public compiled graph and normal digest renderer. The task stops for source
and content review. After the owner approves the exact issue locally, a separate
command validates and renders public HTML. Delivery requires a deployed HTML
match and a separate local approval before a manual Zoho Campaigns send. See
`docs/LOCAL_NEWSLETTER_WORKFLOW.md` for the steps. The watchlist is operational
research strategy, not public application data or evidence by itself.

Official PDFs and API snapshots also land under ignored `artifacts/evidence/`.
Public images may be derived from a reviewed public document only when the media
record retains the exact document source and page/figure locator. Extraction is a
review step; the application never scrapes or downloads documents at runtime.

## Safe extension checklist

When adding a feature, identify its layer first:

- broad entity or relationship: graph YAML and graph schema;
- dated/version-specific assertion: intelligence YAML and intelligence schema;
- public presentation: a mode component consuming compiled data;
- discovery or monitoring: ignored artifact plus human review, not direct publish;
- shareable UI choice: workspace URL state and a round-trip test;
- color or surface: semantic theme token plus light/dark contrast check.

Run `npm run validate:local` for the full local gate. For focused work, at least
run the affected build, TypeScript checks, and matching tests, then visually check
both light and dark themes at desktop and narrow widths.
