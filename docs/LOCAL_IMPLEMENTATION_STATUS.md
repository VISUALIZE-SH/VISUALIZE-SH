# Local implementation status

This document records the local implementation of the approved News, Atlas, and
Data plan. It describes the evidence infrastructure and review surfaces available
in this checkout; it is not a declaration that the pilot is clinically complete or
ready for automated delivery.

The local app keeps the original graph as a retained overview and adds three
workspaces:

- **News** presents source-linked changes and legacy weekly stories.
- **Atlas** presents product families, versions, design/fit/evidence context, and
  lineage.
- **Data** presents claims, endpoints, cohorts, readouts, outcomes, missingness,
  and comparison context.

Deep links use `?mode=news|atlas|data&version=<id>`. The custom-domain deployment
uses `/`; a GitHub Pages project deployment can use `/visualize-sh/`. Local preview
generation accepts `--base /visualize-sh/` and defaults to `/` for localhost and
the custom-domain path.

The current authored pilot is `data/intelligence/pilot.yaml` plus
`data/intelligence/comparative-pilot.yaml`, compiled to
`public/intelligence.json` by `npm run build:intelligence`. Its current counts are:

| Collection | Count |
|---|---:|
| Sources | 20 |
| Product families | 9 |
| Product versions | 14 |
| Claims | 47 |
| Comparison categories | 1 |
| Standard attributes | 11 |
| Device configurations | 8 |
| Comparative metrics | 4 |
| Comparative observations | 20 |
| Regulatory decisions | 9 |
| Indications | 7 |
| Trials | 3 |
| Trial snapshots | 0 |
| Cohorts | 4 |
| Endpoint definitions | 7 |
| Readouts | 5 |
| Outcomes | 8 |
| Lineage edges | 3 |
| Intelligence events | 8 |

The pilot is deliberately reviewable and bounded. Its intelligence records are
currently draft, with explicit source references, limitations, unresolved trial or
software mappings, and missing values. The local newsletter command assembles the
two flagship review previews from these records:

```bash
npm run build:intelligence
npm run newsletter:local -- --base /
npm run newsletter:local -- --dry-run
npm run review:prepare
npm run evidence:snapshot -- --source fda-pma --id P999999S001
npm run evidence:snapshot-document -- --help
```

The two preview issues are written outside the sendable digest tree at
`public/previews/newsletter/`. They are marked **DRAFT REVIEW — FOR LOCAL REVIEW
ONLY; DO NOT SEND** and their paths are excluded from the normal weekly delivery
workflow. `docs/NEWSLETTER_LOCAL_READINESS.md` documents the preview
and preflight behavior. `docs/EVIDENCE_PIPELINE.md` documents deterministic
compilation, immutable local evidence snapshots, and the review packet.

The implementation maps to the approved phases as follows:

| Plan phase | Local status | Scope boundary |
|---|---|---|
| 0. Scope and manual sample | Implemented as a bounded pilot and two local review previews. | Editorial and clinical review are still required before promotion. |
| 1. Provenance and identity | Implemented through the intelligence schema, semantic validation, source locators, review status, legacy graph crosswalks, and deterministic compilation. | Draft records remain separate from approved claims. |
| 2. Atlas profiles and lineage | Implemented for the app’s family/version profiles, dated events, indications, and typed lineage edges. | Pilot breadth and exact product mappings remain incomplete. |
| 3. Trial and Data comparison | Implemented for cohorts, endpoints, readouts, outcomes, denominators, effect uncertainty, explicit missingness, an exact-version attribute matrix, and bounded exact-size sizing/delivery observations for aortic TAVR valves. | No claim is promoted by the UI; pilot comparative observations are unreviewed. Clinical outcomes are not placed in the attribute matrix. |
| 4. Source change proposals | Implemented locally with bounded official-source snapshots, immutable document snapshots, draft queues, and `review:prepare`. | This does not run a continuous monitor or silently apply proposals. |
| 5. Digital extension and editorial launch | Implemented as the FEops/PREDICT-LAA pilot subject and two local flagship previews. | Full clinical curation, broader digital coverage, and production editorial launch remain manual work. |

Remaining work includes source-by-source review and promotion, exact generation or
software-build resolution where evidence allows, current-label reconciliation,
clinical/editorial signoff, and final quality review of the two flagship issues.
The pilot does not broaden the existing graph migration, overwrite legacy records,
or claim complete clinical, regulatory, manufacturing, or surveillance coverage.

Zoho account creation, sender verification, SPF/DKIM/DMARC, hosted signup form,
double opt-in, tracking configuration, public HTTPS verification, protected
environment approval, and any production send remain explicit manual dependencies.
No Zoho credentials or subscriber data belong in this repository. No schedule,
campaign, subscription, remote draft, or send is enabled by this local work, and
these changes have not been pushed from the local checkout.

Final local verification on September 21, 2026 passed:

- `npm run validate:local`: both TypeScript checks, 39 tests, data validation,
  and the repository security scan. Newsletter dry-run correctly reports the
  missing live configuration and makes no network request.
- Production builds for `/` and `/visualize-sh/`, including the appropriate
  asset paths, evidence payloads, and explicit preview `index.html` links.
- Browser checks for News/Atlas/Data navigation, family-only evidence boundaries,
  date filtering, the retained graph, and filtered hierarchy framing. Mobile
  checks at 390 pixels confirmed no page overflow; wide tables scroll within
  their container.
- Actual Chrome downloads of filtered CSV and JSON: two PREDICT-LAA primary-arm
  rows retain 41.8% and 28.9%, source locators, and unresolved build mapping.
- Live public FDA `P140031/S010` and ClinicalTrials.gov `NCT04180605` GET captures
  into ignored `artifacts/evidence/`. The registry's `UNKNOWN` status and estimated
  enrollment remain registry observations, separate from publication results.
- Repeated compilation and preview generation preserve deterministic content.
  `review:prepare` assembles 96 draft records without applying changes.

## Device comparison update — September 22, 2026

The Data workspace now has Browse and Compare views. Aortic TAVR valves are the
first authored comparison category, with SAPIEN 3, SAPIEN 3 Ultra RESILIA,
Evolut FX, and Evolut FX+ as eligible exact-version columns. The Browse view
uses flat evidence rows and a flat figure grid; Compare uses one aligned table
with source and context details. Column order, category, and view round-trip in
the URL. CSV and JSON export the visible comparison rows with explicit gap
statuses and provenance. All new pilot claims remain draft.

`npm run validate:local` passed schema compilation, both TypeScript checks, 54
tests, and the repository security check. Its newsletter dry run still reports
missing production configuration. `npm run build` passed. Browser checks covered
two and four columns, mobile overflow, reorder and history restoration, and
stale category cleanup after changing condition.

Build and verification logs are under ignored `artifacts/validation/`. The final
root-base production build is in `dist/`; the subpath build is retained in
`artifacts/build-subpath/`. New evidence remains draft despite passing software
checks. Live newsletter delivery and clinical/editorial approval are not tested
or activated by these checks.

## Configuration and figure update — September 22, 2026

The comparison now offers exact-size selectors for SAPIEN 3 (20, 23, 26, and
29 mm) and Evolut FX (23, 26, 29, and 34 mm). The 20 source-located
observations include native-annulus sizing, separate SAPIEN 3 CT-area sizing,
and Evolut FX delivery capsule outer diameter. Method and comparability labels
stay visible in the aligned table, source details open inline, and exports keep
configuration and locator fields. Other generations and measurements remain
explicitly uncurated. The [SAPIEN 3 S085 label](https://www.accessdata.fda.gov/cdrh_docs/pdf14/P140031S085D.pdf)
is a historical snapshot requiring current-label reconciliation; the
[Evolut FX label](https://www.accessdata.fda.gov/cdrh_docs/pdf13/P130021S174D.pdf)
is the source for the FX sizing and capsule observations. All 20 observations
remain unreviewed.

Browse presents every available figure for the scoped versions in a flat grid.
Compare presents figures for selected exact versions below the matrix, with no
nested device panels or repeated device headings. Configuration selection and
column order round-trip through the URL. At a narrow viewport, the matrix
scrolls within its own region without widening the page.

For this update, `npm run validate:local` passed 59 tests, both TypeScript
checks, data/schema compilation, and the security check. `npm run build` passed.
Browser checks confirmed source disclosure, three loaded exact-version figures
for four selected columns, and no page overflow at 390 pixels. Newsletter
preflight still reports the expected missing live Zoho configuration.

## Data catalog and layout update — September 23, 2026

Data › Browse now shows Specs, Outcomes, History, and Figures as category-grouped
tables with one fixed column scale: product (with a device thumbnail where a
public figure exists) first, compact source citations last. Rows expand to the
underlying claims, locators, and figures. Compare drops the redundant identity
rows, shows thumbnails and the first US decision, and no longer requires a
condition before a category can be chosen.

Version-wide specs now come from `data/intelligence/taxonomy.yaml` and
per-class `data/intelligence/catalog/*.yaml` fragments, merged before validation.
Current payload: 122 sources, 50 families, 59 versions in 20 categories,
34 standard attributes, 505 attribute claims, 53 regulatory decisions, and 28
figures (25 used as thumbnails). All new records are draft. Figures come from
FDA documents, except three CC BY publication figures. Sheath sizes for APTURE,
V-Wave Ventura, Cardioband, and the Amplatzer PFO/Piccolo remain explicit gaps.

The news feed gained 17 items (valvular, non-valvular/HF, and university or
engineering research); the private watchlist now lists 131 sources in 15
categories, including university department news/publication pages. Verified
corrections were applied to curated atlas entries (aficamten approval,
finerenone and vutrisiran labels, SAPIEN M3 and Tendyne approvals, Trilogy and
Melody dates, Amplatzer VSD pathway, CardioMEMS HERO, Gore/Conformal), each
recorded in `curation.notes`.

`npm run validate:local` passed 64 tests, both TypeScript checks, data
compilation, the security scan, and the newsletter dry run (live Zoho
configuration still missing, as expected). `VITE_BASE=/ npm run build` passed.
Nothing was committed or pushed.

## Local weekly newsletter switch — September 24, 2026

The Sunday Codex task now researches in the saved local project and stops after
validation and draft previews. Its former Gmail delivery instruction was removed.
New weekly news uses `reviewStatus: draft`; the public graph and normal digest
exclude draft news while the ignored `artifacts/newsletter-review/` previews
display it with a **DO NOT SEND** banner. The old GitHub research and Zoho send
workflows are removed. Local public rendering reruns validation, and a separate
local check compares deployed email HTML byte for byte before manual Zoho import.
The old npm shortcuts for API research and programmatic Zoho sends are removed.

`npm run newsletter:review -- --date 2026-09-20` rendered two items locally.
`npm run validate:local` passed 65 tests, both TypeScript checks, schema builds,
and the security scan. `VITE_BASE=/ npm run build` passed. No campaign was
created or sent, and no subscriber data or private watchlist was published.
