# Database audit — October 3, 2026

The audit adds missing company relationships and therapy context, corrects generation-specific specifications and regulatory history, and reconciles trial and news evidence. It includes the working-tree edits already present when the audit began. Changes are prepared on `codex/database-audit` for local review; pushing to origin is deferred until the owner reviews them.

## Coverage and evidence boundary

Every authored record was inventoried across the graph, news, editorial issues, merged intelligence catalog, taxonomy, and comparative data: **1,675 records at the start; 1,769 after enrichment**. Counts use authored YAML, rather than the initially stale generated JSON.

| Collection | Before | After |
| --- | ---: | ---: |
| Companies | 38 | 54 |
| Therapies | 96 | 100 |
| Graph trials | 70 | 73 |
| Conditions | 18 | 19 |
| News stories | 102 | 102 |
| Intelligence families / versions | 79 / 96 | 83 / 101 |
| Intelligence sources | 195 | 224 |
| Expanded intelligence claims | 663 | 686 |
| Regulatory decisions / indications | 57 / 7 | 62 / 9 |
| Comparison categories | 27 | 29 |

The resulting graph has 75 device, 14 pharmaceutical, seven procedure, and four digital therapy records. Existing 27 outcome observations, 19 readouts, and 20 comparative observations were retained.

Three Luna subagents reviewed LAA/septal devices, valves and comparative evidence, and trials/conditions in parallel. Parent review covered corporate history, drugs, HF devices, software crosswalks, remaining products, source reconciliation, and integration. Primary evidence included regulator records and labeling, official corporate announcements, registries, guidelines, and original clinical publications. Indexed primary abstracts were used where full text was inaccessible; that limitation is recorded in the domain reports.

**Inventory coverage is exhaustive; independent factual verification is bounded by the available sources.** A populated source field does not certify every fact in a record, and the offline audit does not test link reachability. Older company headquarters/tickers, some secondary-source specifications, uncertain product lifecycle claims, and unpublished details still need review. New and revised clinical/catalog facts remain draft; existing reviewed facts were not automatically promoted by this audit.

## Applied company and therapy corrections

- **PLAATO / Appriva:** added `co-appriva-medical` and its product relationship. Original clinical evidence identifies Appriva; the corporate history records Microvena's 2002 acquisition, the later ev3 Endovascular name, and ev3's reported 2005 cessation of PLAATO development/commercialization. Acquisition history is distinguished from marketing authorization. [Original PLAATO publication](https://pubmed.ncbi.nlm.nih.gov/11997272/), [ev3 SEC filing](https://www.sec.gov/Archives/edgar/data/1318310/000110465906052498/a06-15615_110q.htm), [Delaware Supreme Court decision](https://law.justia.com/cases/delaware/supreme-court/2007/98990.html).
- **Historical LAA makers:** added missing entities for Coherex, Custom Medical Devices, Cardia, Shape Memory Alloy, pfm medical, SentreHEART, Aegis, Conformal, Eclipse, Shanghai Push, AtriCure, Laminar, and Hangzhou Dinova. Along with Appriva and the FEops/DASI software companies, this adds 16 company records. Prolipsis remains the only non-procedure therapy without a verified maker.
- **SeaLA:** preserved the owner-approved Nuomao/Dinova attribution; recorded the 2022 legal-name change shown in the patent assignment history rather than assigning the device to Valued Medical. Unsupported frame composition was removed from asserted specifications. [Patent assignment history](https://patents.google.com/patent/US10792045B2/en).
- **Corporate lineage:** clarified SentreHEART → AtriCure; Coherex → Biosense Webster; Neovasc → Shockwave → Johnson & Johnson; V-Wave → Johnson & Johnson; MyoKardia → BMS; Valtech and Endotronix → Edwards; Conformal → Gore; and Story Health → Innovaccer. Edwards' proposed JenaValve acquisition was abandoned, so JenaValve remains the product company. Corcym's operations began in June 2021. Corresponding official announcements are retained in each company record.
- **Company identity:** corrected the P+F website and distinguished Occlutech's Swiss holding company from its German operating presence. Added verified FEops/DASI context and AtriCure's Mason, Ohio headquarters. Historical firms' current websites, offices, tickers, and ownership were not invented.
- **Descriptions and relationships:** all 100 therapies now have descriptions, mechanisms, and information links. Procedure entries have guideline-based context without invented product manufacturers or FDA product dates. Hello Heart has a systemic-hypertension condition target; this does not imply demonstrated HFpEF treatment efficacy.

## Generations, materials, and regulatory scope

- Added separate graph products for **GORE CARDIOFORM ASD**, **FEops HEARTguide**, **DASI PrecisionTAVI**, and **aortic SAPIEN XT**. Their existing or new intelligence versions now resolve to the appropriate products. The larger-defect GORE ASD device is distinct from the septal/PFO configuration; the software products provide planning support rather than a proven therapeutic outcome.
- Added SAPIEN XT model 9300TFX and primary material evidence. Its original June 16, 2014 US indication was severe symptomatic native AS at high-or-greater surgical risk; off-label caval implantation remains a separate record. PARTNER 2A is linked to XT, while the SAPIEN 3 registry is distinct. [Original FDA SSED](https://www.accessdata.fda.gov/cdrh_docs/pdf13/P130009B.pdf).
- Checked current SAPIEN 3 Ultra RESILIA labeling: **four sizes, 20/23/26/29 mm**, with model-specific CT/TEE ranges and Commander compatibility. Added the April 30, 2025 FDA asymptomatic-severe-AS expansion as a separate decision/indication. Exact compatible sheath Fr values remain unresolved. The old claim that tissue/skirt were the only changes was withdrawn. [FDA S182 labeling](https://www.accessdata.fda.gov/cdrh_docs/pdf14/P140031S182D.pdf).
- Added or corrected exact-device materials for Mi-CHORD, TricValve, TRICENTO, Occlutech PLD, CorCap, HeartMate II/3, TriMemo, and Memo 4D Curve. Navitor's NaviSeal is recorded as **UHMWPE (polyethylene)**, reconciling polymer-grade and generic descriptions. Evolut FX materials update the original canonical pilot claims; duplicate generated claims were removed during integration.
- **TriMemo:** K260498, April 14, 2026 clearance, six sizes 26–36 mm. The correct construction locator is physical PDF page 5, printed Summary page 1; Carbofilm coats the PET fabric. **Memo 4D Curve:** K261707, June 18, 2026 clearance, ten sizes 24–42 mm; 24–32 mm are flat and 34–42 mm are 3D. Exact first-human dates and commercial distribution remain unverified. [TriMemo summary](https://www.accessdata.fda.gov/cdrh_docs/pdf26/K260498.pdf), [Memo 4D Curve summary](https://www.accessdata.fda.gov/cdrh_docs/pdf26/K261707.pdf).
- Replaced review-only HF-device specifications with original studies, sponsor design material, or FDA panel evidence for FIRE1 NORM, V-LAP, Corvia, Ventura, and APTURE. Study antithrombotic regimens and panel submissions are explicitly separated from approved labeling. RESPONDER-HF's current sponsor report is 260 randomized participants rather than the historical 750 plan.
- Corrected earliest verified CE/US milestones for major valves and clips, preserving later FDA decisions separately. Month/year precision is retained where exact certificate dates were not established. Ecliptis now cites FDA K254232 directly for its June 26, 2026 **510(k) clearance**; LARIAT tool clearance is not represented as an FDA stroke-prevention indication.
- Preserved the owner's early-FLX 2015/2016 history, suspended LAMINAR status, SeaLA ownership correction, and Amulet's eight sizes. Original Watchman, early FLX, current FLX/FLX Pro, and Amulet 360 remain separate generations.
- Corrected figure provenance/captions for the SAPIEN platform reference, LAmbre, Reducer, and Corvia. Added CC BY 4.0 license references and crop attribution without changing the source images.

## Drugs, trials, conditions, and news

- Refreshed drug-label context, including tafamidis' non-interchangeable 80 mg/61 mg formulations, vutrisiran vitamin-A guidance, Verquvo starting-dose options, Kerendia HF dosing, Myqorzo's marketed status, and omecamtiv's current COMET-HF program. Earlier non-cardiac approvals are distinguished from subsequent cardiac indication expansions.
- **Camzyos:** retired the pending-PDUFA wording after the September 30, 2026 approval. The current US indication includes adults and pediatric patients ≥30 kg; pediatric starting doses depend on weight and are not copied from adult dosing. Added a separate SCOUT-HCM graph trial, NCT06253221, with 44 adolescents and its positive primary readout. [FDA notice](https://www.fda.gov/drugs/news-events-human-drugs/fda-approves-first-drug-improve-functional-capacity-and-symptoms-children-rare-inherited-heart), [September 2026 prescribing information](https://packageinserts.bms.com/pi/pi_camzyos.pdf).
- Added AZD5462 and tirzepatide intelligence families/versions. LUMINARA's borderline primary comparison does not establish clinical-outcome benefit or approval. The 731-participant tirzepatide HFpEF **SUMMIT** is separate from Tendyne's device **SUMMIT**; current Zepbound labeling does not itself authorize HFpEF treatment.
- Verified registry identities now exist for **68 of 73 graph trials**, versus 17 of 70 before the audit. Enrollment gaps fell from 11 to two. New trials are COMET-HF, tirzepatide SUMMIT, and SCOUT-HCM. Cohort-specific numbers distinguish registry plans, randomized participants, treated populations, and analysis denominators.
- Corrected **CLOSURE-AF to 912 randomized**, with 888 in the primary analysis, and verified NCT03463317 from the original indexed NEJM abstract. Its March 18, 2026 online publication replaces the stale November 2025 note. Later sex-specific conference data remain draft news pending primary subgroup evidence. [Original publication](https://www.nejm.org/doi/full/10.1056/NEJMoa2513310).
- Verified additional start dates from indexed official registry records: SCOUT-HCM April 17, 2024; MOMENTUM 3 September 2, 2014; ReChord November 3, 2016; TRICAVAL January 2015, with **month precision only**. The current TRICAVAL registry also confirms 28 actual participants and termination for safety concerns. PEERLESS pulmonary-thrombectomy studies were not substituted for PEERLESS-HF.
- All 19 condition records have supporting references. The September 10, 2026 CMS final memo is separated from FDA labeling: symptomatic severe AS coverage no longer requires CED, while asymptomatic severe AS remains subject to the stated CED and indicated-system requirements. [CMS final decision](https://www.cms.gov/medicare-coverage-database/view/ncacal-decision-memo.aspx?NCAId=321&proposed=N).
- Reviewed all 102 news records; 23 received corrections or an explicit draft hold. The feed now has 56 non-draft and 46 draft stories. Fixed ACASA-TAVI's unrelated source, added original NOTION-4/TAVI-PCI evidence, narrowed CMS edges to the condition, removed an unsupported named ASD-occluder edge, and scoped recalls correctly. Harmony FDA recall **220767 concerns delivery catheters**; **220518 concerns specified HeartMate 3 kit batteries**.
- Emboliner's story date changed September 10 → September 9. Its ID prefix was migrated accordingly; this is the only original record ID removed, and the same story remains under the corrected ID. The migration is documented in the news resolutions. No original therapy, company, condition, or trial IDs or root-level fields were deleted.

## Remaining gaps

These are explicit review items, not values to fill by inference. Exact records and source locators are available in the machine-readable inventory.

| Gap | Before | After | Interpretation |
| --- | ---: | ---: | --- |
| Missing therapy description / information link | 95 / 74 | 0 / 0 | Product/procedure context added |
| Missing non-procedure company relationship | 20 | 1 | Prolipsis maker remains unverified |
| No explicit evidence field | 60 | 0 | Structural completeness; not factual certification |
| Missing trial registry ID | 53 | 5 | Acorn no-MVR, PLD multicenter, Mi-CHORD pilot, KISS, TRICENTO |
| Missing trial enrollment | 11 | 2 | APOLLO and ENCIRCLE full-program totals |
| Missing trial start | 13 | 9 | Includes studies without a verified registry identity |
| Timeline without a source | 33 | 1 | LAmbre's older CE milestone needs primary confirmation |
| Secondary-source intelligence claims | 57 | 15 | Remaining specifications need primary confirmation |
| Unverified/inapplicable implant materials | 19 | 15 | Includes an external battery kit and unresolved early devices |
| Product timeline absent | 46 | 42 | Often investigational or historical products |
| Unknown regulatory status | 17 | 18 | Uncertainty was preserved or made explicit |
| Company HQ / website absent | 9 / 7 | 19 / 16 | Added historical firms often lack verified current details |

Ten intelligence claims remain `not_publicly_disclosed`, six `not_yet_reviewed`; three trial evidence records retain mixed-generation mappings and five retain unclear mappings. These statuses prevent generation borrowing and fabricated precision. CorCap withdrawal timing remains review-reported, and the current CORCINCH-HF official registry refresh remains incomplete. Generic news hubs, uncertain implant dates, secondary subgroup reporting, and unverified software/device benefit claims remain visible in the domain reports.

## Review artifacts and reproducibility

- [Full 1,769-record inventory](audit/2026-10-03-inventory.json): record origin, evidence URLs/locators, review state, and completeness gaps.
- [Field-level authored changes](audit/2026-10-03-changes.json) and [starting counts](audit/2026-10-03-baseline-summary.json): compared with the initial working tree, preserving pre-existing owner edits.
- [News resolutions](audit/2026-10-03-news-resolutions.json): applied fields, the Emboliner ID migration, and unresolved story-specific evidence.
- Domain reports: [LAA/septal](audit/2026-10-03-laa.md), [valves](audit/2026-10-03-valves.md), [trials/conditions](audit/2026-10-03-trials-conditions.md), [remaining devices/drugs](audit/2026-10-03-remaining.md), [pilot/comparative](audit/2026-10-03-pilot-comparative.md), and [news](audit/2026-10-03-news.md).

The domain reports and their findings JSON preserve intermediate review findings. This consolidated report and final authored YAML supersede candidate patches: later checks resolved SAPIEN XT indication scope, RESILIA sizes/sizing, Memo ring shapes, Navitor material wording, TriMemo's physical PDF locator, current TRICAVAL identity/status, CLOSURE-AF, and the Camzyos pediatric decision. Candidate material/generation transfers were not applied automatically.

The new `npm run audit:database -- --date 2026-10-03 --output docs/audit/2026-10-03-inventory.json` command reproduces the offline inventory. Generated graph/intelligence JSON is rebuilt from authored YAML.

Validation completed successfully:

- `npm run validate:local`: graph/intelligence compilation, both TypeScript checks, **88/88 tests**, security scan of 182 repository files, and newsletter dry-run.
- `VITE_BASE=/ npm run build`: production compilation succeeded; local newsletter previews were stripped from the distribution.
- `npm run audit:database`: reproduced the 1,769-record inventory and recorded the remaining gaps.
- `git diff --check`: passed. Semantic comparison with the initial authored YAML found no removed root-level fields and only the documented news ID migration.

The newsletter run was a local dry-run. No newsletter was delivered, site deployed, or Git branch pushed.
