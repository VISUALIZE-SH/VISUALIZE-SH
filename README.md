# VISUALIZE-HF

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
  graph/     Cytoscape setup, styles, layouts, palette
  components/ GraphCanvas, Header, Filters, DetailPanel, SearchBar, Legend, About
  data/      loadGraph.ts
  types/     entities.ts (TS mirror of the schema)
```

## Deployment

Pushing to `main` builds and deploys to GitHub Pages via
`.github/workflows/deploy.yml`. The production base path is `/VISUALIZE-HF/`
(the repo name); for a different repo name or a custom domain set `VITE_BASE`
(e.g. `VITE_BASE=/ npm run build`). Any static host (Netlify, Vercel, S3) also
works — just serve `dist/`.
