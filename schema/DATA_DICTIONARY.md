# VISUALIZE-SH — Data Dictionary & Authoring Guide

This is the **contract** for the data layer. Read it fully before adding or editing
data — whether you are a human curator or an automated update routine.

The graph is built from four entity YAML files plus a news feed in `data/`. Each
file is a **YAML list**. Entities reference each other **by `id`**; the build step
(`npm run build:data`) turns those references into graph edges and **fails the
build** if anything is malformed or a reference doesn't resolve.

```
data/conditions.yaml   conditions / anatomy        (cond-*)
data/therapies.yaml    devices, drugs, digital,    (rx-* dev-* dig-* proc-*)
                       procedures
data/companies.yaml    organizations               (co-*)
data/trials.yaml       clinical trials             (trial-*)
data/news.yaml         source-linked news feed     (news-YYYY-MM-DD-*)
```

JSON Schemas in `schema/*.schema.json` are the machine-checked source of truth for
field names, types, and allowed values. This document explains them in prose.

---

## News (`data/news.yaml`)

News items are not graph nodes. They are a compact, source-linked feed that can
focus related nodes in the graph and can be displayed in an entity's detail panel.
The build serializes them at `graph.news`, newest first, and reports `newsCount`
and `latestNewsDate` in `graph.meta`.

```yaml
- id: news-2026-07-07-example-readout
  publishedAt: "2026-07-07"
  title: "Short, source-faithful headline"
  summary: "One or two concise sentences explaining why it matters."
  sourceName: "Publisher or organization"
  sourceUrl: "https://www.example.org/news/item"
  additionalSources:
    - label: "Corroborating journal or filing"
      url: "https://www.example.org/second-source"
  topicTags: ["HCM", "clinical evidence"]
  relevantNodeIds: ["cond-hcm", "trial-example"]
```

Required fields are `id`, `publishedAt`, `title`, `summary`, `sourceName`,
`sourceUrl`, `topicTags`, and `relevantNodeIds`. Use an immutable, date-prefixed
id; correct copy in place but never reuse an id for a different story. Sources
must be canonical public HTTPS URLs. `relevantNodeIds` must be non-empty and every
id must already exist in the entity files; the build fails if a target is missing.

Summaries may use two or three original sentences (up to 650 characters) when
needed to preserve the scope, result, and uncertainty found in historical email
newsletters. Do not copy or lightly paraphrase extended publisher text. When the
same development is reported by several sources, create one item, choose the most
authoritative source as `sourceUrl`, and put up to five useful independent or
primary corroborating citations in `additionalSources`; do not duplicate the
primary URL there.

For the weekly routine, append each selected item to this file and retain older
items as feed history. Favor the original press release, regulator, journal, or
trial registry over an aggregator. Each item should be independently useful, short,
and source-faithful; a news item is not a substitute for updating a clinical claim
in an entity's curation block.

---

## ID conventions

IDs are stable, lowercase, kebab-case, and **prefixed by type**. The prefix is
load-bearing — the build validates it.

| Entity | Prefix | Example |
|---|---|---|
| Condition | `cond-` | `cond-hfpef` |
| Pharmaceutical | `rx-` | `rx-mavacamten` |
| Device | `dev-` | `dev-watchman-flx` |
| Digital therapy | `dig-` | `dig-story-health` |
| Procedure | `proc-` | `proc-septal-myectomy` |
| Company | `co-` | `co-abbott` |
| Trial | `trial-` | `trial-explorer-hcm` |

**Never change an existing `id`** — references break. To rename a display name,
edit `name`, not `id`.

---

## The `curation` block (required on every entity)

```yaml
curation:
  status: curated        # "curated" (human-reviewed) | "draft" (auto-suggested)
  lastUpdated: 2026-06-22 # ISO date (YYYY-MM-DD)
  sources:               # optional but strongly encouraged: URLs or "PMID:#######"
    - "https://www.fda.gov/..."
  notes: "..."           # optional free text (e.g. what to verify)
```

- **An automated routine must only create entities with `status: draft`** and must
  not flip anything to `curated`. Promotion to `curated` is a human action.
- Drafts render with a dashed outline and can be hidden with the "Show drafts"
  filter, so unreviewed data is always visually distinct.
- Always set `lastUpdated` to the date of the edit and add `sources`.

---

## The `pulse` field (optional, on every entity type)

`pulse` is a **0–10 newsworthiness score** (10 = the most recent/heaviest coverage,
0 or absent = unscored / quiet). It is a top-level field — a sibling of `curation`,
not inside it — and is allowed on conditions, therapies, companies, and trials.

```yaml
pulse: 8   # number, 0–10; out-of-range values are clamped at build time
```

What it drives: in the graph, **label font size scales with `pulse`**, so the
hottest topics stay legible when zoomed out and quieter ones reveal as you zoom in.
It does **not** affect validation, edges, or filtering.

How to score it (rough guide):

| Pulse | Meaning |
|---|---|
| 8–10 | Front-of-mind now: a recent approval, a pivotal readout, an acquisition, or active controversy |
| 5–7 | Established and clinically active, still frequently discussed |
| 2–4 | Background / mature standard of care |
| 0–1 (or omit) | Historical or low-attention |

`pulse` is meant to be **refreshed on a cadence** — it reflects attention *now*, so
the update routine should re-score existing entities as the news cycle moves, not
just set it once. Lower a score when a topic goes quiet; raise it on fresh news.
Keep scores **relative to each other** so the graph reads sensibly.

---

## The `timeline` block (optional, therapies and trials only)

`timeline` drives the Timeline view. It is allowed on **therapies** and
**trials**. Do **not** add it to companies; organizations are context nodes, not
dated events. Conditions/anatomy also do not get timeline dates.

```yaml
timeline:
  date: "2024-04-01"       # ISO date used for placement
  precision: month         # "day" | "month" | "year"
  dateBasis: fda-approval  # see allowed values below
  event: "FDA approval for tricuspid regurgitation"
  source: "https://..."    # optional but preferred
  notes: "..."             # optional uncertainty / assumption note
```

Allowed `dateBasis` values:

| Value | Use |
|---|---|
| `fda-approval` | FDA approval, HDE, PMA, or other FDA marketing authorization |
| `ce-mark` | European CE mark / CE certification |
| `availability-announcement` | A news or company announcement of general availability when the approval date cannot be verified |
| `trial-start` | Clinical trial start date, preferably from ClinicalTrials.gov |

Therapy timeline rule: use the earliest verified FDA approval or CE mark for the
specific product/therapy represented by the entity. If there are multiple approval
types or indication expansions (IDE, HDE, PMA, supplemental approvals, low-risk
expansions, etc.), use the earliest marketing authorization for the product or
product lineage captured by the entity. If the approval date is uncertain, use the
date when general availability in the US or Europe was announced in a credible
news/company source, set `dateBasis: availability-announcement`, and explain that
assumption in `notes`.

Trial timeline rule: use the date when the trial started. Prefer the
ClinicalTrials.gov `startDateStruct.date` and put the study URL in `source`. If
only a month or year is available, store the first day of that month/year in
`date`, set `precision` to `month` or `year`, and do not imply day-level accuracy.

The Timeline view hides entities without `timeline.date`, so missing or uncertain
dates should be omitted rather than guessed.

---

## Conditions (`data/conditions.yaml`)

| Field | Req | Notes |
|---|---|---|
| `id` | ✓ | `cond-…` |
| `type` | ✓ | literal `condition` |
| `name` | ✓ | display name |
| `abbreviation` | | e.g. `HFpEF` |
| `category` | ✓ | grouping for filters; reuse an existing value (see below) |
| `anatomy` | | list of structures, e.g. `["left atrial appendage"]` |
| `description` | | 1–2 sentences |
| `pulse` | | 0–10 news-attention score (see above) |
| `curation` | ✓ | see above |

**Recommended `category` vocabulary** (keep consistent — new values fragment the
filters): `Atrial fibrillation / stroke prevention`, `Septal & congenital defect`,
`Cardiomyopathy`, `Infiltrative cardiomyopathy`, `Heart failure`,
`Coronary microvascular`, `Aortic valve disease`, `Mitral valve disease`,
`Tricuspid valve disease`, `Pulmonary valve disease`.

---

## Therapies (`data/therapies.yaml`)

Devices, pharmaceuticals, digital therapeutics, and procedures all live here,
discriminated by `therapyType`.

| Field | Req | Notes |
|---|---|---|
| `id` | ✓ | prefix MUST match `therapyType` (`rx`→pharmaceutical, `dev`→device, `dig`→digital, `proc`→procedure) |
| `type` | ✓ | literal `therapy` |
| `therapyType` | ✓ | `pharmaceutical` \| `device` \| `digital` \| `procedure` |
| `subtype` | | drug class or device class, e.g. `SGLT2 inhibitor`, `interatrial shunt` |
| `name` | ✓ | brand + generic, e.g. `Dapagliflozin (Farxiga)` |
| `company` | | a `co-…` id; omit for generic procedures |
| `treats` | ✓ | non-empty list of `cond-…` ids |
| `regulatoryStatus` | ✓ | `approved` \| `investigational` \| `discontinued` (coarse, for filtering) |
| `regulatoryDetail` | | free text specifics, e.g. `FDA approved 2022; REMS` |
| `mechanism` | | how it works |
| `description` | | optional extra context |
| `materials` | devices only: ✓ | key permanent-implant materials; list of `{name, role, category, source, note?}` |
| `links` | | list of `{label, url}` info links (see "Links" below) |
| `timeline` | | placement date for first FDA/CE approval or verified availability announcement |
| `pulse` | | 0–10 news-attention score (see above) |
| `curation` | ✓ | see above |

Use `regulatoryStatus` for the broad bucket (it drives the filter) and put the
nuance (dates, geographies, CRLs, breakthrough designation) in `regulatoryDetail`.

For device `materials`, include only decision-useful implant materials: the
frame/body alloy, biologic leaflet tissue, functional fabric or sealing skirt,
surface coating, sensor housing, and anchoring material. Exclude delivery-system
plastics, sutures, sterilization residuals, trace alloy constituents, and other
incidental materials. Use one of `frame`, `leaflet`, `fabric`, `coating`, `sensor`,
or `anchor` for `category`, and attach a direct public HTTPS source to every item.
If a material applies only to one model in a family record, say so in `note`.

---

## Companies (`data/companies.yaml`)

| Field | Req | Notes |
|---|---|---|
| `id` | ✓ | `co-…` |
| `type` | ✓ | literal `company` |
| `name` | ✓ | |
| `ticker` | | e.g. `BSX` |
| `hq` | | city, region, country |
| `website` | | must be a full `https://…` URL |
| `description` | | note acquisitions/ownership here |
| `pulse` | | 0–10 news-attention score (see above) |
| `curation` | ✓ | see above |

---

## Trials (`data/trials.yaml`)

| Field | Req | Notes |
|---|---|---|
| `id` | ✓ | `trial-…` |
| `type` | ✓ | literal `trial` |
| `name` | ✓ | acronym, e.g. `EXPLORER-HCM` |
| `nctId` | | `NCT########` (exactly 3 letters + 8 digits). **Only add if verified** — a wrong NCT deep-links to the wrong study |
| `phase` | | free text, e.g. `Phase 3`, `Pivotal RCT` |
| `status` | | `recruiting` \| `active` \| `completed` \| `terminated` \| `unknown` |
| `conditions` | ✓ | non-empty list of `cond-…` ids |
| `therapies` | ✓ | non-empty list of therapy ids |
| `enrollment` | | integer |
| `year` | | integer (key readout / publication year) |
| `primaryEndpoint` | | |
| `outcomeSummary` | | 1 sentence on the result |
| `resultStatus` | ✓ | `positive` \| `mixed` \| `negative` \| `ongoing` \| `terminated` |
| `references` | | list of URLs or `PMID:#######` (a ClinicalTrials.gov search link is a fine fallback) |
| `links` | | list of `{label, url}` outcome-summary links, NOT ClinicalTrials.gov (see "Links" below) |
| `timeline` | | trial start date (`dateBasis: trial-start`) |
| `pulse` | | 0–10 news-attention score (see above) |
| `curation` | ✓ | see above |

Note: the therapy↔trial and condition↔trial links are recorded **only on the
trial** (`therapies`, `conditions`). Do not add a reciprocal list on therapies or
conditions — the app derives the reverse direction automatically.

---

## Links (`links` on therapies and trials)

Optional list of labeled external links shown in the detail panel's **More info**
section. Each item is `{ label, url }` (the `url` must be a full `https://…`).

```yaml
links:
  - label: "Product page"
    url: "https://www.example.com/products/foo"
```

- **Therapies (devices especially):** the **product page on the maker's site** if it
  exists; otherwise a reputable third-party source (journal article, medical-news
  site, or clinical source). Drugs/procedures may link a label or guideline.
- **Trials:** a source that **summarizes the outcomes other than ClinicalTrials.gov**
  (the primary journal article, a TCTMD/medical-news write-up, or a guideline). Leave
  the ClinicalTrials.gov deep-link to be handled automatically from `nctId`.
- The panel **always also shows a PubMed search link** generated from the entity name
  (a verifiable fallback), so an entity is never link-less. Only add `links` when you
  have a *specific, verified* URL — never invent one (same rule as `nctId`).

---

## How references become edges

The build derives directed edges from these fields (and only these):

| Edge | From → To | Source field |
|---|---|---|
| `treats` | therapy → condition | `therapy.treats[]` |
| `made_by` | therapy → company | `therapy.company` |
| `evaluates` | trial → therapy | `trial.therapies[]` |
| `studies` | trial → condition | `trial.conditions[]` |

---

## Recipe: adding a new entity

1. Pick the right file and a unique, prefixed `id`.
2. Fill required fields; reuse existing `category`/`subtype` values where possible.
3. Reference other entities by `id` — **create the referenced entity first** if it
   doesn't exist (e.g. add the company before the device that points to it).
4. Set `curation.status: draft`, `curation.lastUpdated: <today>`, and add
   `sources`.
5. Run `npm run build:data` and fix any reported errors.

## Recipe: adding a trial readout for an existing therapy

1. Add a `trial-…` entity with `therapies: [<existing-id>]` and the relevant
   `conditions`.
2. Set `resultStatus` and a one-line `outcomeSummary`.
3. If the readout changes approval status, update the therapy's
   `regulatoryStatus`/`regulatoryDetail` — but if you are an automated routine,
   leave the therapy `status: curated` untouched and instead add a
   `curation.notes` flag describing the suggested change for human review.

---

## Validation: `npm run build:data`

Runs all checks and writes `public/graph.json`. Common errors:

- `… must be string / must be equal to one of the allowed values` — a field has
  the wrong type or an out-of-enum value.
- `… references unknown id "X"` — a referenced entity doesn't exist (create it).
- `… references "X" which is a <type>, expected <type>` — reference points at the
  wrong entity type.
- `Duplicate id: X` — two entities share an id.
- `therapy "X" has prefix "…-" but therapyType "…"` — id prefix and `therapyType`
  disagree.

A green run prints node/edge/draft counts. The build must be green before commit.

---

## Hard rules for an automated update routine

1. Only **add** entities or **append** fields; never delete curated entities.
2. New/changed entities you author get `curation.status: draft`.
3. Every draft must include at least one `sources` URL.
4. Never invent `nctId`s or enum values; if unsure, omit the optional field.
5. Reuse existing `category`/`subtype` vocabulary; don't coin near-duplicates.
6. Set/refresh `pulse` (0–10) on new entities and re-score existing ones to match
   the current news cycle — raise it on fresh coverage, lower it as topics go quiet.
   `pulse` is the one field you may update on a `curated` entity without flipping it
   to `draft` (it is a presentation signal, not a clinical claim). Keep scores
   relative and clamp to 0–10.
7. Add `timeline` to new therapies and trials when a date is verifiable. Use the
   therapy and trial rules above. Never add `timeline` to companies. If the date
   is uncertain, omit it unless you have a credible availability announcement and
   can explain the assumption in `timeline.notes`.
8. Run `npm run build:data` and resolve all errors before finishing.
9. Summarize what you added/changed (ids + why) for the human curator.

---

## Versioned intelligence (`data/intelligence/pilot.yaml`)

The versioned intelligence pilot is a source-linked evidence layer alongside the
retained graph. `npm run build:intelligence` validates the YAML against
`schema/intelligence.schema.json` and writes the static payload to
`public/intelligence.json`; the app reads that payload for Atlas and Data views.
The local newsletter preview reads the compiled payload when it is present and
falls back to the authored YAML only for local validation and review.

The companion `data/intelligence/comparative-pilot.yaml` supplies exact-size
device configurations, metric definitions, and source-located observations for
the Data comparison table. Its shape follows
`schema/comparative-observation.schema.json`. Each configuration identifies an
exact `product_version_id`; build validation checks the linked family and
generation. Each observation retains its method, source locator, extraction
date, review status, and comparability rationale. Do not copy a family or
successor value into an uncurated size. See
[the comparative data model](../docs/COMPARATIVE_DATA_MODEL.md) for authoring
rules and the initial FDA-label scope.

The top-level collections are:

| Collection | Purpose |
|---|---|
| `sources` | Publisher records and stable URLs used by source references. |
| `families`, `versions` | Product identity, generation context, and version-level links. |
| `claims` | Typed technical or operating assertions with basis, availability, and limits. |
| `decisions`, `indications` | Jurisdiction-specific decisions and the populations or uses they cover. |
| `trials`, `trialSnapshots`, `cohorts` | Study identity, dated registry state, and analysis populations. |
| `endpoints`, `readouts`, `outcomes` | Endpoint definitions, dated readouts, and cohort-by-arm results. |
| `lineage`, `events` | Version relationships and dated design, indication, or evidence changes. |

Every evidence record carries `reviewStatus` and `sourceRefs`. A `draft` record
is reviewable context and is excluded from a production weekly issue by default.
Promotion requires human source review and resolved locators; a URL alone does
not establish that a claim is clinically complete. Record IDs are stable,
lower-kebab-case identifiers. The legacy graph crosswalk is explicit through
`entityIds` and `conditionIds`; it does not silently rename or delete legacy
records.

Product versions are distinct from product families, and trial records are
distinct from readouts and analysis cohorts. A readout with an empty
`versionIds` list and a populated `familyIds` list is family-level context with
an unresolved exact build. Consumers must preserve that limitation rather than
infer a generation. Dates retain their declared precision. Outcomes preserve
the cohort, arm, endpoint, timepoint, analysis population, denominator, effect
measure, confidence interval level and sidedness, p-value qualifier, and any
explicit missingness or limitation.

For the full workflow, see [the evidence pipeline](../docs/EVIDENCE_PIPELINE.md),
[local implementation status](../docs/LOCAL_IMPLEMENTATION_STATUS.md), and
[local newsletter readiness](../docs/NEWSLETTER_LOCAL_READINESS.md).
