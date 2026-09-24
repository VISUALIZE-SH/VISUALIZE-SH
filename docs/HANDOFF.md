# Collaborator handoff

Start here when taking over this checkout. This is a static React/Vite site; no
application server or database is required. Node 20 and the lockfile are used in
GitHub Actions.

## First local run

```sh
npm ci
npm run dev
```

`predev` validates and rebuilds both public JSON payloads. Vite serves the site at
`http://localhost:5173`. For a complete local gate, run `npm run validate:local`
and `VITE_BASE=/ npm run build`. The former checks both TypeScript projects, all
script tests, data compilation, the repository content scan, and a no-network
newsletter preflight. The latter checks the production bundle at the custom
domain root. `npm run build` without `VITE_BASE=/` targets the GitHub Pages project
path `/visualize-sh/`.

Before editing, run `git status --short`. This handoff was prepared in a checkout
with substantial uncommitted feature work, including new files; do not assume
`main` or the deployed site contains it. Do not commit generated or authored work
on someone else's behalf without reviewing the diff.

## Where changes belong

| Need | Source to edit | Check and generated result |
| --- | --- | --- |
| Broad entity, graph relationship, or weekly news | `data/{conditions,therapies,companies,trials,news}.yaml` | `npm run build:graph` → `public/graph.json`; rules in `schema/DATA_DICTIONARY.md` |
| Exact product version, claim, trial result, or dated event | `data/intelligence/pilot.yaml` | `npm run build:intelligence` → `public/intelligence.json`; schema and semantic validator in `scripts/intelligence/validation.ts` |
| Exact-size comparison observation | `data/intelligence/comparative-pilot.yaml` | Same intelligence build; comparison rules in `docs/COMPARATIVE_DATA_MODEL.md` |
| Device/drug class or standard attribute | `data/intelligence/taxonomy.yaml` | Same intelligence build; Data spec-table columns |
| Product specs, FDA decisions for a class | `data/intelligence/catalog/<class>.yaml` | Same intelligence build; format in `data/intelligence/catalog/README.md` |
| Local flagship preview selection | `data/editorial-issues.yaml` | `npm run newsletter:local` → `public/previews/newsletter/` |
| Weekly public/email digest | `data/news.yaml` | `npm run newsletter:render -- --date YYYY-MM-DD` → `public/digests/` |
| Shareable UI filter or selection | `src/data/workspace-state.ts`, then `src/App.tsx` | `scripts/workspace-state.test.ts` and browser back/forward checks |

The YAML is authoritative; generated JSON and HTML are committed for static
hosting. Regenerate and review generated diffs after changing source data. The
graph is a broad navigation crosswalk; `intelligence.json` contains source-located,
version-specific evidence. A graph therapy node is not itself an exact device
version or an evidence claim. Draft evidence can appear in local views with its
review state, but must not be treated as clinically approved.

`src/App.tsx` coordinates modes and shared URL state. `src/components/intelligence/`
renders News, Atlas, and Data. `src/data/comparison.ts` builds the comparison
matrix and exports; `src/graph/` handles the Cytoscape graph. Change schema and
validation together when adding a field, then update the corresponding TS types.

## Review and publishing boundaries

- `npm run review:prepare` creates a local review packet from draft evidence and
  source-change proposals. FDA and ClinicalTrials.gov snapshots under ignored
  `artifacts/evidence/` are discovery inputs, not automatic edits to curated YAML.
- `npm run newsletter:research -- --dry-run` checks local research configuration
  without an API call. A real research run uses a private watchlist in ignored
  `artifacts/research/source-registry.yaml` or the CI secret and writes a proposal
  under ignored `artifacts/`; `newsletter:apply` adds draft-safe items for review.
- `npm run newsletter:local -- --dry-run` reports configuration names and statuses
  without writing files or contacting Zoho. The flagship previews are marked
  draft and live outside the sendable `public/digests/` tree.
- GitHub's weekly research workflow is off until
  `NEWSLETTER_AUTOMATION_ENABLED=true`. Research opens a review PR; delivery is a
  separate manual workflow from `main`, gated by a merged PR, exact Pages content,
  the `SEND` input, and the `zoho-production` environment approval. See
  `docs/CLOUD_WORKFLOW.md` for the full sequence.
- This checkout cannot verify GitHub rulesets, Zoho account settings, consent,
  sender authentication, or any successful production send. The outstanding
  account and domain setup is in `docs/ZOHO_CAMPAIGNS_SETUP.md`; the code review
  boundary and residual risks are in `docs/SECURITY_REVIEW.md`.

Keep credentials, subscriber data, private source watchlists, downloaded evidence,
and validation logs out of Git. The corresponding local `artifacts/` directory
is ignored. Before merging a weekly issue, review each source and draft entity,
the generated HTML, and the exact diff. Before retrying a failed send, inspect
Zoho for an already created or delivered campaign.

## Documentation map

- `README.md`: product overview and common commands.
- `docs/ARCHITECTURE.md`: runtime, data, and review ownership.
- `schema/DATA_DICTIONARY.md`: graph/news authoring contract.
- `docs/EVIDENCE_PIPELINE.md` and `docs/COMPARATIVE_DATA_MODEL.md`: evidence
  compilation, provenance, and configuration-level data rules.
- `docs/NEWSLETTER_LOCAL_READINESS.md`: draft preview and preflight behavior.
- `docs/CLOUD_WORKFLOW.md`, `docs/ZOHO_CAMPAIGNS_SETUP.md`, and
  `docs/SECURITY_REVIEW.md`: cloud operations and rollout gates.
- `docs/LOCAL_IMPLEMENTATION_STATUS.md`: dated implementation and verification
  record. `docs/DEVICE_COMPARISON_PLAN.md` and
  `docs/VISUALIZE_SH_NEWS_ATLAS_DATA_PLAN.md` are design history; check the code and
  status record for what is implemented now. `ROUTINE.md` is the legacy local
  Sunday task contract until cloud cutover is confirmed.
