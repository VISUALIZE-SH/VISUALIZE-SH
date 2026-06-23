# VISUALIZE-SH

An interactive, front-end-only **knowledge graph of the structural heart
landscape** — valvular and non-valvular — covering conditions and anatomy, the
therapies that target them (devices, pharmaceuticals, digital therapeutics,
procedures), the companies behind them, and the clinical trials that evaluate them.

Built with React + TypeScript + Vite + [Cytoscape.js](https://js.cytoscape.org/).
The data is hand-curated YAML, validated and compiled into a static graph — so the
whole thing deploys as plain static files and is easy to keep up to date.

> ⚕️ **For educational use only — not medical advice.** Data may be incomplete or
> out of date; verify against primary sources (FDA labeling, ClinicalTrials.gov,
> peer-reviewed publications).

## Quick start

```bash
npm install
npm run dev          # builds data, then starts Vite at http://localhost:5173
```

Other scripts:

```bash
npm run build:data   # validate data/*.yaml -> public/graph.json
npm run build        # build:data + typecheck + production build to dist/
npm run preview      # serve the production build locally
npm run typecheck    # TypeScript only
```

## How it works

```
data/*.yaml  ──(npm run build:data)──►  public/graph.json  ──►  React + Cytoscape app
(source of truth,        validate +                         (loads graph.json at runtime)
 hand-curated)           derive edges
```

- **Source of truth** is the YAML in `data/` (one file per entity type). Entities
  reference each other by `id`.
- `scripts/build-data.ts` validates every entity against `schema/*.schema.json`,
  checks referential integrity, derives the graph edges, and writes
  `public/graph.json` (committed, so no server is needed).
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
- **Lean initial load:** Vite splits the bundle into long-cache vendor chunks
  (`react`, `cytoscape`, `force`) plus a small app chunk, so a data/UI edit only
  busts the app chunk. The Hierarchy layout's `dagre` dependency is dynamically
  imported — it loads only when you first open that view, keeping it off the
  critical path (see [`cytoscapeSetup.ts`](src/graph/cytoscapeSetup.ts) and
  [`vite.config.ts`](vite.config.ts)).

## Updating the data

Read **[`schema/DATA_DICTIONARY.md`](schema/DATA_DICTIONARY.md)** — it documents
every field, the id conventions, and the rules. The short version:

1. Edit the YAML in `data/` (add entities as `curation.status: draft` with
   `sources`).
2. `npm run build:data` — must pass (it fails on bad data or dangling references).
3. Review drafts in the app, promote to `curated`, commit, and deploy.

A scheduled assistant can draft updates for you — see
**[`ROUTINE.md`](ROUTINE.md)**.

## Design system

The visual language (Source Sans Pro type, deep-purple brand, vivid-violet links)
is derived from [harshadparanjape.com](https://www.harshadparanjape.com/) and
documented in **[`DESIGN.md`](DESIGN.md)**. All UI chrome reads from design tokens
in `src/index.css` (`:root`); the categorical node palette lives in
`src/graph/palette.ts`.

## Project layout

```
data/        YAML source of truth (conditions, therapies, companies, trials)
schema/      JSON Schemas + DATA_DICTIONARY.md
scripts/     build-data.ts (validate + compile)
public/      graph.json (generated, committed)
DESIGN.md    design system (tokens, type scale, palette)
src/
  graph/     Cytoscape setup, styles, layouts, palette, elasticPull, clusterByCondition, declutter
  components/ GraphCanvas, Header, Filters, DetailPanel, SearchBar, Legend, About
  data/      loadGraph.ts
  types/     entities.ts (TS mirror of the schema)
```

## Deployment

Pushing to `main` builds and deploys to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). To turn it on,
enable **Settings → Pages → Source: GitHub Actions** once.

The site is served from a project sub-path (`https://<owner>.github.io/<repo>/`),
so asset URLs need the right base. CI sets `VITE_BASE` from the repo name
automatically, so it works whatever the repo is called. For a **custom domain**,
add a `public/CNAME` file and build with `VITE_BASE=/`. Local builds default to
`/visualize-sh/` (see [`vite.config.ts`](vite.config.ts)). Any static host
(Netlify, Vercel, S3) also works — just serve `dist/` at the matching base.
