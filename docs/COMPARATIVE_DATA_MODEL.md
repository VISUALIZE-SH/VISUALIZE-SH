# Comparative structural-heart data model

## Purpose and boundary

This specification is a source-located comparison contract for structural-heart device evidence. It makes configuration, measurement method, anatomy, population, and follow-up explicit before a value can appear in a comparison UI. It is not a clinical decision tool, a device ranking, or a causal model.

The model was designed from the ignored local research notes in `artifacts/research/`. Those notes are research inputs only; this tracked specification contains no cached paper, licensed article text, or proprietary numeric result. A public observation must carry its own public source URL and precise locator.

The data model has three layers:

1. **Core device/configuration card.** One record per family, generation, and labeled size/configuration. It records therapy class, target anatomy, mechanism, design/anchor/seal features, delivery route and exactly which delivery component a French measurement describes. It also carries labeled fit/anatomy information when reported.
2. **Mechanism-specific performance modules.** Measurements belong to a module rather than a universal device scorecard. Valve replacement, leaflet repair, occlusion/sealing, and deployment-bench modules retain their own methods and conditions.
3. **Clinical follow-up module.** Procedure, imaging/physiology, safety, functional status, and hard outcomes are observations with a cohort, denominator where relevant, endpoint definition, and explicit follow-up window.

The canonical interchange format is [comparative-observation.schema.json](../schema/comparative-observation.schema.json). The first bounded dataset is [comparative-pilot.yaml](../data/intelligence/comparative-pilot.yaml), compiled into the Data comparison view. It adds configuration observations without replacing version-wide claims.

## Configuration card

Do not collapse a product family into a single device. `configuration_id` identifies a family + generation + configuration/label size. A configuration card requires therapy class, target structure, and mechanism, and can record:

- delivery route, component (`sheath`, capsule, introducer, or guide catheter), profile definition, profile in Fr, and minimum vessel diameter;
- frame/leaflet materials and position, anchoring and seal design, retrieval/repositioning;
- labeled anatomy/fit range, with modality and measurement phase where available.

`14 Fr` is not sufficient context by itself: a capsule, an introducer, a compatible sheath, and a transiently expanding sheath can be materially different claims.

## Modules and proposed-metric revision

Metric definitions declare the module, applicability, required context fields, and default comparability. The following maps the eight proposed metrics into the standardized model.

| Proposed metric | Standard metric / module | Revision and required context |
| --- | --- | --- |
| Radial force (COF/RRF) | `radial_force`, deployment bench | Optional and normally `within_family_only` or `not_comparable`. Record the precise construct (COF, RRF, stiffness, strength), loading direction/diameter, fixture, temperature, rate, device size, and statistic. Never label an unlabeled number simply “radial force.” |
| Delivery-system outer diameter (Fr) | `delivery_profile_fr`, core card | Core catalog field, conditionally comparable only with route, measured component, OD/ID/compatibility definition, generation/configuration, and vessel requirement. |
| GOA / EOA | `geometric_orifice_area` / `effective_orifice_area`, valve replacement | Keep GOA and EOA separate. GOA requires plane/method. EOA is valve-replacement-specific and must label bench vs echo/catheter method, flow or physiologic state, size, and timepoint; clinical EOA may also need BSA for EOAi. |
| Recoil / foreshortening % | `recoil_pct` / `foreshortening_pct`, deployment bench | Optional configuration-specific engineering fields. Preserve nominal dimensions, deployment/expansion protocol, measurement landmarks, reference dimension, pressure/temperature, and method. Do not infer from final imaging. |
| Mean pressure gradient | `mean_transvalvular_gradient`, valve hemodynamics | Applicable to valve replacement and selected repair/replacement cases, but aortic, mitral, and tricuspid values are not one ranking. Require site, Doppler/catheter/pulse-duplicator method, flow/heart rate/rhythm if reported, size, and follow-up. |
| Regurgitant fraction / jet velocity | `regurgitant_fraction` or a lesion-specific residual metric | Conditional. Record origin (total, transvalvular, paravalvular), modality, jet count/location, numerator/denominator, flow conditions, and timepoint. A single jet velocity is not a universal severity measure. |
| LVEF + remodeling | `left_ventricular_ejection_fraction`, `ventricular_volume`, clinical follow-up | Keep LV and RV measures separate rather than creating a “remodeling index.” Require echo/CMR method, ventricle/phase, baseline and exact follow-up, lesion phenotype, and cohort context. Direction of change is not inherently favorable. |
| PVL circumferential extent | `paravalvular_leak_circumferential_extent`, TAVR sealing subfield | TAVR-specific and `within_family_only`. Require modality/plane, annular level, jet count, circumference denominator, timepoint, and accompanying integrated grading/quantitation if reported. LAAO instead uses peri-device leak width/area and threshold; TEER/TTVR use their residual-lesion measures. |

### Module applicability

- **Valve replacement:** bench hydrodynamics (EOA/gradient/regurgitation under a stated protocol), clinical valve hemodynamics, PVL/residual regurgitation, implant position, thrombosis/durability.
- **Leaflet repair (M-TEER/T-TEER):** leaflet and coaptation anatomy, implant/grasp configuration, residual MR/TR grade, site-specific transmitral/tricuspid gradient, single-leaflet attachment, functional and ventricular follow-up.
- **Occlusion/sealing (LAAO, septal):** landing-zone/defect dimensions, compression or device-to-anatomy relation, release criteria, position, residual leak/shunt by modality, embolization, thrombus and erosion/effusion as applicable.
- **Deployment bench:** radial mechanics, recoil, foreshortening, anchoring/pullout, fatigue, and other nonclinical measurements. These are never silently substituted for patient imaging or outcomes.
- **Clinical follow-up:** technical/device success, procedure/access events, residual lesion/seal, imaging physiology, NYHA/KCCQ/6MWD, hospitalization, stroke, mortality, reintervention, bleeding, and device-specific safety. Each is a discrete observation, not a composite device score.

## Missingness, disclosure, and comparability

Missingness is meaningful evidence, not zero. Every observation has one `measurement_status`:

| Status | Meaning |
| --- | --- |
| `reported` | A source reports a value or categorical result; the value, unit/statistic, method, timepoint, context, and provenance are required. |
| `tested_not_publicly_disclosed` | A source documents that a test was performed, but does not disclose a usable public value. Record test coverage/method and locator; do not create a numeric value. |
| `not_reported` | The scoped source does not report the measure. |
| `not_extracted` | Potentially present but not yet extracted/reviewed; this is workflow state, not a conclusion. |
| `not_applicable` | The measure is not meaningful for this mechanism/configuration. |
| `conflicting_sources` | A non-value reconciliation record that points through `conflict_observation_ids` to at least two separate `reported` observations for the same configuration and metric. It must not duplicate either source value. |

Research notes may flag a **definition mismatch** (for example, a bench quantity versus a clinical imaging quantity with the same casual label). That is not a seventh missingness status: retain each source result as `measurement_status: reported` and set `comparability: not_comparable` (or `within_family_only` when the shared family/protocol restriction is defensible), with the mismatch in `comparability_rationale`.

Every observation also carries a comparability classification and a human-readable rationale:

- `direct`: same metric definition, method/conditions, configuration scope, anatomy/population context, and timepoint are sufficiently aligned.
- `conditional`: usable only after the stated stratification or adjustment (for example, same valve site, size, and echo window).
- `within_family_only`: valid for configuration/generation variants under a shared protocol, not as a cross-family metric.
- `not_comparable`: retained for auditability but excluded from numeric comparison.

The schema requires `method`, `timepoint`, `context`, provenance, and a comparability rationale even for an explicit non-value state. “Not reported” can therefore state the scope searched instead of looking like a blank cell.

## Required context and provenance

For a reported observation, record at least:

- configuration ID, metric ID, module, target structure, and setting (`bench`, `procedural`, or `in_vivo`);
- method modality, protocol/grading standard, and condition summary; bench records additionally name fixture/model, loading or flow conditions, temperature, and sample/cycle details when available;
- labeled timepoint and phase, anatomy/model context, and cohort/sample context; event records include denominator, event window, and adjudication/endpoint definition;
- scalar/categorical value, unit, statistic, dispersion and sample size as applicable; and
- source type, public URL, locator (table/page/section/figure), extraction date, review status, and any DOI/PMID/PMCID.

The JSON Schema checks document shape. The focused `validateComparativeDataset` helper additionally enforces unique configuration/metric/observation IDs; resolves configuration and metric references; verifies metric applicability to the configuration’s therapy class; enforces observation-module equality with the metric module; and verifies that every conflict reference exists, is `reported`, and shares the conflict record’s configuration and metric. Reviewers still assess whether the claimed comparability rationale is scientifically supported.

## UI lenses

The UI should begin with a **configuration card** and allow lenses, not a single global sort:

- **Catalog/use lens:** therapy, mechanism, generation, size, delivery and labeled anatomy fit.
- **Mechanism lens:** show only metrics applicable to the selected therapy module; e.g., never render LAAO compression beside TAVR radial force as equivalent performance.
- **Evidence-method lens:** split bench, procedural, and in-vivo observations. Never chart a pulse-duplicator gradient beside an echo gradient without a conspicuous method distinction.
- **Clinical follow-up lens:** compare only aligned endpoint definition, denominator, cohort, and follow-up window. Keep physiology/function separate from hard outcomes.
- **Evidence-quality lens:** expose source locator, review status, missingness, and comparability. Default quantitative comparisons to `direct`; permit `conditional` only with its rationale visible; show `within_family_only` as a restricted comparison and retain `not_comparable` as an audited, non-ranked record.

No lens may imply deterministic engineering-to-clinical causation. A design feature may be displayed as a source-backed hypothesis or association with its evidence and limitations; it must not be rendered as “design X causes outcome Y” merely because both records exist.

## Extraction and review workflow

1. Create or select the exact configuration card; do not merge generations, label sizes, or mixed-generation cohorts.
2. Define/select the metric and its applicable module before copying a result. Capture the source’s term and method rather than forcing it into an attractive universal field.
3. Create one source observation per configuration, cohort/sample, method, and timepoint. Retain each reported source value separately; if sources conflict, add a non-value `conflicting_sources` record that references them rather than copying values. Record other non-values using the missingness states above rather than blanks or zeros.
4. Attach source URL and a precise locator. Cite public primary/regulatory sources for public claims; do not store copied licensed documents or proprietary test output.
5. Assign comparability conservatively. A reviewer confirms alignment of definition, method, conditions, anatomy/population, configuration, and timepoint before changing a record to `direct`.
6. Run JSON Schema validation and collection-level reference/applicability checks. A clinical/evidence reviewer then approves publication; unresolved values remain `not_extracted` or `conflicting_sources`.

The focused synthetic validation test at [comparative-schema-validation.test.ts](../scripts/comparative-schema-validation.test.ts) exercises all six statuses, non-value constraints, bench conditions, auditable conflicts, and collection-level reference/applicability/module checks.

## First curated configuration scope

The September 2026 pilot links four SAPIEN 3 model 9600TFX sizes and four Evolut FX sizes to their exact product versions. Twenty observations cover labeled native-annulus sizing and, for Evolut FX, delivery **capsule outer diameter**. SAPIEN 3 TEE diameter guidance and Evolut FX native-annulus diameter criteria share a row for navigation, but their method distinction and restricted comparability remain visible. CT area and CT area-derived diameter are separate SAPIEN rows. The Evolut FX capsule value is not labeled as a minimum vessel diameter or a generic sheath profile.

The SAPIEN measurements come from [FDA SAPIEN 3 supplement S085 instructions for use](https://www.accessdata.fda.gov/cdrh_docs/pdf14/P140031S085D.pdf), PDF page 2, Table 2. That is a historical label snapshot; it has not been reconciled against every later label. Evolut FX measurements come from [FDA Evolut FX instructions for use](https://www.accessdata.fda.gov/cdrh_docs/pdf13/P130021S174D.pdf), PDF pages 32–35, Tables 2–3 and Figure 2. All pilot observations are `unreviewed`. They need source and clinical review before approval. The Data view's evidence date filters observations by extraction date, so it is a curation snapshot rather than a reconstruction of labeling valid on that day.

## Version-wide spec catalog

Configuration observations above carry size- and method-specific values. Most
reader questions start one level up: what a product is made of, how it is
delivered, which sizes and anatomy it covers, what the US label says, and which
trial supported approval. Those version-wide facts live in
[`taxonomy.yaml`](../data/intelligence/taxonomy.yaml) (classes and standard
attributes) and per-class [`catalog/*.yaml`](../data/intelligence/catalog/README.md)
fragments. Each value keeps its own source and locator and compiles to a draft
claim; configuration-scoped attributes still require observations. A
`pivotal-trials` value names the trial only. Outcome numbers stay in readouts
with their cohort, endpoint, and follow-up context.
