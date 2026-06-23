# VISUALIZE-HF — Data Dictionary & Authoring Guide

This is the **contract** for the data layer. Read it fully before adding or editing
data — whether you are a human curator or an automated update routine.

The graph is built from four YAML files in `data/`. Each file is a **YAML list of
entities**. Entities reference each other **by `id`**; the build step
(`npm run build:data`) turns those references into graph edges and **fails the
build** if anything is malformed or a reference doesn't resolve.

```
data/conditions.yaml   conditions / anatomy        (cond-*)
data/therapies.yaml    devices, drugs, digital,    (rx-* dev-* dig-* proc-*)
                       procedures
data/companies.yaml    organizations               (co-*)
data/trials.yaml       clinical trials             (trial-*)
```

JSON Schemas in `schema/*.schema.json` are the machine-checked source of truth for
field names, types, and allowed values. This document explains them in prose.

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
| `curation` | ✓ | see above |

**Recommended `category` vocabulary** (keep consistent — new values fragment the
filters): `Atrial fibrillation / stroke prevention`, `Septal & congenital defect`,
`Cardiomyopathy`, `Infiltrative cardiomyopathy`, `Heart failure`,
`Coronary microvascular`.

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
| `curation` | ✓ | see above |

Use `regulatoryStatus` for the broad bucket (it drives the filter) and put the
nuance (dates, geographies, CRLs, breakthrough designation) in `regulatoryDetail`.

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
| `curation` | ✓ | see above |

Note: the therapy↔trial and condition↔trial links are recorded **only on the
trial** (`therapies`, `conditions`). Do not add a reciprocal list on therapies or
conditions — the app derives the reverse direction automatically.

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
6. Run `npm run build:data` and resolve all errors before finishing.
7. Summarize what you added/changed (ids + why) for the human curator.
