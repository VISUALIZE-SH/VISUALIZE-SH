# Device comparison in Data — implementation plan

> Design history: this plan records the initial decision and pre-implementation
> baseline. Browse/Compare, exact-version columns, and the first exact-size
> observations are now implemented. See `docs/LOCAL_IMPLEMENTATION_STATUS.md`
> for the dated implementation record and `docs/COMPARATIVE_DATA_MODEL.md` for
> the current authoring contract.

## Goal and recommended scope

Let a reader select two to four devices in one clinical/device category and scan the same standard attributes across columns. The first worked example is **SAPIEN 3 versus Evolut FX for aortic stenosis**. Each column identifies an exact product version. A family name is useful for discovery, but it must not stand in for a generation, size, or delivery configuration.

Ship a first comparison of **source-linked catalog and version-wide design attributes**, plus any fit attribute genuinely supported at version scope. Add size-specific measurements and clinical outcome comparisons only after their configuration, method, and cohort context is curated. The UI must show gaps and draft status rather than filling cells from a related generation or treating a missing value as zero. There is no device score or winner.

### Decisions for the first release

| Decision | Recommendation | Reason |
| --- | --- | --- |
| Eligible peers | Same condition **and** an explicitly authored comparison category (for the pilot: aortic TAVR valve replacement). | `cond-as` currently includes the PrecisionTAVI planning product as well as valves. Condition alone does not define comparable devices. |
| Column identity | Exact `ProductVersion`; show family in the selector and the version name once in the column header. | SAPIEN and Evolut each have two pilot versions, with different amounts of evidence. |
| Column count | Two initially; allow up to four; prevent duplicates. | Keeps the matrix usable and the selection model small. |
| Missing cells | Show `Not curated`, `Not yet reviewed`, `Not publicly disclosed`, `Not applicable`, or `Conflicting sources` as appropriate. | These are different evidence states; a blank or dash is ambiguous. |
| Quantitative values | Require a specific configuration and the comparability checks in `COMPARATIVE_DATA_MODEL.md`. | A version-wide claim cannot safely supply a size-specific delivery profile, hemodynamic value, or outcome. |
| Existing Data records | Keep Browse access to design claims, trials, history, and figures. Flatten its presentation as part of this feature. | The current nested product/category/record cards make cross-product scanning difficult. |

## Baseline when this plan was written

At the start of this work, `DataWorkspace.tsx` presented versions as product
groups and had no comparison state or normalized standard-attribute rows. This
paragraph describes that earlier baseline, not the current UI.

The pilot had `family-sapien` and `family-evolut`, both associated with
`cond-as`, and four versions: SAPIEN 3, SAPIEN 3 Ultra RESILIA, Evolut FX, and
Evolut FX+. Their claims could not simply be pivoted on `key`: the SAPIEN
`frame` claim combined frame material and expansion, while the Evolut `frame`
claim combined frame and leaflet information. The initial claims were draft.
Configuration observations are now loaded from
`data/intelligence/comparative-pilot.yaml`; the remaining gaps are explicit in
the Data view.

## Interaction and layout

1. Keep the shared **Condition** and **Evidence through** controls. In Data, add a two-way **Browse | Compare** switch near the single page title. The global single Product / configuration selector appears in Browse; Compare has its own column selectors in the content area, so there are no competing product controls. Retain jurisdiction where it applies to regulatory or labeled rows; do not imply it changes a jurisdiction-neutral design fact.
2. In Compare, require a condition and offer only authored comparison categories with at least two eligible versions. For Aortic Stenosis, show **Aortic TAVR valves**; exclude PrecisionTAVI. Group version choices by family and show the exact version name. If the reader switches from a selected Browse version, seed column one with that version. Offer a one-click **SAPIEN 3 / Evolut FX** example in the empty state, with both version names visible before the matrix appears. Never silently choose a newer generation.
3. Put selected versions in one compact control row. Each has a remove action and accessible move-left/move-right controls; Add device remains available until four columns are selected. Changing condition or category removes selections that are no longer eligible and explains why; it never substitutes another product. Fewer than two valid selections returns to the selection prompt.
4. Use **one semantic comparison table**. The left column holds the standard attribute; each selected version has one compact column header. Render section dividers as plain table rows, not cards. Show value, unit when relevant, a visible evidence state, and a small source action within each cell. Expanding a row reveals its per-device context, boundary, review state, and exact source locator in one full-width detail row. Keep only one detail row open at a time.
5. Default to attributes relevant to the category that have at least one curated observation or an explicit gap state. A **Show all standard attributes** control can reveal rows still awaiting curation. Search and record-type filters belong to Browse, not as a second navigation layer over Compare. Comparison export is adjacent to the table controls.
6. On narrow screens, retain the same side-by-side structure inside **one horizontally scrolling table region**. Freeze the attribute column and version header, use a subtle scroll cue, and keep the page itself from overflowing. Do not stack device cards vertically, because that breaks row alignment.

### Layout sketch

```text
Data                                  Browse | Compare
Condition: Aortic Stenosis   Category: Aortic TAVR valves   Evidence through: [date]
Compare: [SAPIEN 3 ×] [Evolut FX ×] [+ Add device]       Export CSV / JSON

Attribute                    SAPIEN 3              Evolut FX
──────────────────────────────────────────────────────────────────
Identity
  Manufacturer               [value]               [value]
  Product generation         [value]               [value]
Design
  Expansion mechanism        [cited value]         [cited value]
  Frame material             [cited value]         [cited value]
  Leaflet material           [cited value]         [cited value]
  Sealing design             [cited value]         [status]
Delivery and fit
  Delivery profile           Needs configuration  Needs configuration
  Labeled anatomy range      Needs configuration  Needs configuration
──────────────────────────────────────────────────────────────────
Click a row/cell for scope, limitations, review state, and source locator.
```

The sketch uses placeholders, not proposed clinical facts. Configuration-dependent rows appear only when “Show all standard attributes” is enabled until exact configurations are curated. The table has one title for the page and one header per selected device; it has no device panels, repeated device subtitles, category cards, or record cards.

### Browse simplification

Replace the current `productGroups` presentation with one flat evidence list or table under the existing record-type tabs. **Product/version** becomes a field in every row, so cross-product records retain attribution without outer product panels. Use light section dividers only where they improve scanning. Keep trial population/follow-up and family-level mapping visible in the row or inline detail. Figures can be a simple flat figure grid under Figures, with version in each caption; do not wrap that grid in a product card and another gallery card. Remove the large “How to use this view” panel; keep a concise help link or one-line hint. Preserve filtering, provenance expansion, Atlas navigation, and existing exports.

## Standard attributes and evidence rules

The first registry should use stable IDs, labels, order, category applicability, value type, and scope. A proposed initial set is:

| Section | Initial attributes | Scope rule |
| --- | --- | --- |
| Identity | Manufacturer, family, exact version/model, target structure, therapy mechanism | Curated family/version identity. |
| Design | Expansion mechanism, frame material, leaflet material/position, anchoring, sealing design, repositioning/retrieval, relevant deployment or coronary-access feature | Version-wide only when the source actually describes the whole version; a feature specific to FX+ stays with FX+. |
| Delivery and fit | Access route, measured delivery component and profile, labeled size, labeled anatomy range | Show values only for an explicitly selected configuration/size with method and label context. |

Do not put engineering questions, editorial interpretations, raw figures, regulatory decisions, or trial outcomes into these standard attribute cells. They remain in Browse or in a later, separately scoped comparison lens. A version-wide design value must never be copied to a successor solely through a lineage edge. Multiple source values for one attribute remain separate until reviewed; a conflict state links them rather than choosing one. Keep original source wording and locators in the detail disclosure, even if the matrix uses a normalized display label.

For clinical comparisons later, require aligned endpoint definition, cohort, denominator, follow-up, measurement method, and version mapping. Family-level or mixed-generation trials may be discoverable but must not become a value in an exact-version column. The existing comparative contract's `direct`, `conditional`, `within_family_only`, and `not_comparable` classifications should control whether numerical cells may be juxtaposed or calculated. Do not sort devices by numerical result.

## Data and implementation plan

1. **Author eligibility and attribute definitions.** Add comparison-category definitions to the intelligence data contract, including condition ID, therapy class, target structure, mechanism, and eligible version IDs (or explicit version membership). Validate that referenced versions exist and match the category. Add a standard-attribute registry with stable IDs and category applicability. Avoid inferring category membership from free-text names or `conditionIds` alone.
2. **Curate the pilot facts.** Normalize compound SAPIEN/Evolut claims into discrete source-located attributes after checking the cited source text. An optional comparison-attribute ID on a claim can make existing claims the authored source for version-wide cells. Preserve each claim's availability, basis, observed date, review status, context, limitation, and source references. Do not parse compound prose at runtime or promote the draft claims to reviewed through the UI. For an uncurated cell, display workflow state rather than claiming the source did not report it.
3. **Build a pure comparison projection.** In a helper outside `App.tsx`, take scoped intelligence data, category, selected version IDs, as-of date, and jurisdiction where applicable; return ordered row/cell objects with value or explicit status and provenance. Reject ineligible/duplicate versions, keep exact-version attribution, and handle multiple observations without silently selecting a favorable value. `App.tsx` should only pass state and callbacks.
4. **Add shareable state.** Extend `workspace-state.ts` with `dataView`, `compareCategory`, and ordered repeated `compare` version parameters. Validate ID syntax, deduplicate, cap at four, and round-trip. Keep the existing single `version` state for Browse/Atlas; switching views preserves each view's selection. After data loads, prune IDs outside the chosen category/condition and show a notice. Browser back/forward must restore the chosen columns and order.
5. **Build the flat UI.** Split Data into small Browse and Compare components, share source/status renderers, and remove the product/category/record card hierarchy from Browse. Add a single table scroll boundary and sticky header/attribute column. Keep semantic table headers, keyboard-operable controls, descriptive source links, text status labels, visible focus, and reduced-motion behavior.
6. **Keep measured metrics on the comparative contract.** When size-specific or clinical rows are ready, link each `device_configuration` to an exact `ProductVersion`, compile a reviewed comparative dataset, and integrate the existing schema plus `validateComparativeDataset` into the build gate. Render only observation-level values with configuration, method, timepoint, comparability rationale, and provenance. Do not manufacture a pseudo-configuration for versions without a known labeled size/model.
7. **Export the actual view.** Keep existing Browse CSV/JSON behavior. For Compare, export visible rows in a tidy format: category, attribute ID/label, version/family/configuration IDs, value/unit or status, scope, context, as-of, review state, comparability when applicable, source URL, and locator. JSON also preserves selected column order. An exported absence must retain its reason.

Likely touchpoints: `src/components/intelligence/DataWorkspace.tsx`, a new comparison component/helper under `src/components/intelligence/` and `src/data/`, `src/components/intelligence/intelligence.css`, `src/App.tsx`, `src/data/workspace-state.ts`, `src/types/intelligence.ts`, `schema/intelligence.schema.json`, `scripts/build-intelligence.ts`, and curated `data/intelligence/pilot.yaml`. The existing `schema/comparative-observation.schema.json`, its validator, and `docs/COMPARATIVE_DATA_MODEL.md` govern the later configuration/measurement phase.

## Acceptance criteria and verification

- With Aortic Stenosis selected, the Compare picker offers SAPIEN and Evolut valve versions in the aortic TAVR category and excludes PrecisionTAVI. A reader can compare SAPIEN 3 and Evolut FX in aligned rows, add a third/fourth eligible version, remove/reorder columns, and cannot add a duplicate or out-of-category version.
- Version-specific facts remain on their own versions: an FX+ feature does not appear in the FX column; SAPIEN 3 facts do not appear in Ultra RESILIA without their own source. Uncurated and undisclosed cells carry different visible labels. Draft facts remain visibly draft.
- Each displayed fact opens its context, limitation, exact source URL/locator, and review state. As-of filtering excludes later observations; jurisdiction changes only rows scoped to it. No trial value is placed in an exact-version column from family-only or mixed-generation evidence.
- A share link restores condition, category, column order, view, and as-of state. Switching back to Browse preserves its single-product context. Invalid and stale URL IDs fail safely with a clear empty state.
- The Browse page no longer renders nested product/category/record frames or repeated device title/subtitle blocks. Its search, record-type views, source details, figures, Atlas links, and exports still work.
- At desktop and 390-pixel widths, the matrix stays aligned and the page has no horizontal overflow outside the table region. Keyboard and screen-reader users can identify each cell's row and version header and open sources/details. Light and dark themes remain legible.
- Focused tests cover category eligibility, URL round-trips/pruning, normalization, missingness, exact-version boundaries, as-of behavior, conflict handling, and export content. Run the affected build and TypeScript checks, `npm run validate:local`, and visual checks at desktop/narrow widths before merging.

## Release sequence

1. **Data review:** agree on category IDs and attribute vocabulary; curate and source-check the SAPIEN 3/Evolut FX pilot rows. Record gaps without guessing.
2. **MVP:** flat Browse layout, exact-version Compare table, selection/deep links, provenance, and exports for qualitative attributes.
3. **Expansion:** add other aortic valve generations and categories after each has reviewed field coverage. Add exact-size configuration and measured/clinical lenses only through the comparative-observation validation and evidence review process.

The first release is useful even while coverage is sparse because it makes the gaps explicit and puts the available source-linked attributes on the same rows. The principal dependency is curation of normalized facts; a UI pivot of the present free-text claims would misalign attributes.

## Implementation status — September 22, 2026

The version-wide MVP and the first bounded configuration curation are implemented locally. Data now has a flat Browse view, a single comparison table, a two-to-four-column selector, exact-size selectors for SAPIEN 3 and Evolut FX, source and method details, shareable state, and CSV/JSON export. Figures for all available scoped versions appear in Browse; figures for selected exact versions appear after the comparison table. The layout does not add a device panel around each column.

The comparative pilot contains eight exact-size configurations, four metric definitions, and 20 FDA-label observations. These records are marked `unreviewed`; the SAPIEN 3 S085 source is a historical label snapshot. Missing FX+/Ultra RESILIA configuration values, SAPIEN delivery measurements, and clinical outcomes remain visible gaps. Current-label reconciliation and clinical review are still required before the values can be promoted. The implementation and source limitations are recorded in [COMPARATIVE_DATA_MODEL.md](COMPARATIVE_DATA_MODEL.md) and [LOCAL_IMPLEMENTATION_STATUS.md](LOCAL_IMPLEMENTATION_STATUS.md).
