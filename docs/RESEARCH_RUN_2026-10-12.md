# Research run — October 12, 2026

Local draft review under [WOR-29](https://linear.app/workspace-visualize-sh/issue/WOR-29/research-october-12-developments-and-missing-entries-across-news-atlas); digest rehearsal [WOR-14](https://linear.app/workspace-visualize-sh/issue/WOR-14/verify-the-recurring-aggregated-digest-draft-and-review-handoff). News scan October 6–12, with missing-entry lookback July 12–October 12. Historical documentary records were added where needed to establish product identity; they are not described as new approvals.

Added 19 draft news items, 29 graph entities (2 conditions, 6 companies, 10 products/study interventions, 11 trials), 14 product profiles, 32 claims/spec values, 6 FDA decision records, 11 dated trial snapshots, and 14 endpoint outcomes. All new factual records remain draft. Preexisting authored entity/news and pilot-array records were preserved semantically; existing owner changes and authored specialty articles remain intact. No images/full text added.

The source-located catalog is `data/intelligence/catalog/research-2026-10-12.yaml`; trial/cohort/readout additions are in `data/intelligence/pilot.yaml`. YAML remains authoritative; both public JSON payloads were regenerated. Public graph News retains 67 existing publishable stories and excludes all 19 new drafts.

## Local review

[Review hub](http://127.0.0.1:5174/review.html) · [News](http://127.0.0.1:5174/?mode=news&newsFrom=2026-10-06&newsTo=2026-10-12) · [Atlas profiles](http://127.0.0.1:5174/?mode=atlas&atlas=profiles&jurisdiction=all) · [Data](http://127.0.0.1:5174/?mode=data&jurisdiction=all). The ignored site copy includes inherited and new draft News with a draft title prefix and a review banner; authored review states were not promoted.

Sunday October 11 browser/email draft and supplementary October 12 browser/email draft each contain eight in-window items. Their source outputs are under ignored `artifacts/newsletter-review/<date>/`. They were rendered with the existing `--review` renderer after the complete local validation gate; no sendable digest was generated. The regular Sunday cadence was not changed.

## Changed IDs and sources

### News

| ID | Source |
| --- | --- |
| news-2026-10-12-acacia-hcm-additional-hfsa-analyses | [Cytokinetics, Incorporated](https://www.globenewswire.com/news-release/2026/10/12/3379213/35409/en/cytokinetics-announces-additional-data-from-acacia-hcm-presented-at-the-hfsa-annual-scientific-meeting-2026.html) |
| news-2026-10-11-acoramidis-independent-ehr-comparison | [BridgeBio Pharma, Inc.](https://investor.bridgebio.com/news/news-details/2026/Acoramidis-Associated-with-Significantly-Improved-Clinical-Outcomes-Versus-Tafamidis-in-ATTR-CM-in-an-Independent-Real-World-Study-of-U-S--Electronic-Health-Records/default.aspx) |
| news-2026-10-11-tovinontrine-cycle-phase2 | [Cardurion Pharmaceuticals](https://cardurion.com/cardurion-pharmaceuticals-presents-phase-2-results-for-tovinontrine-crd-750-a-pde9-inhibitor-as-a-novel-treatment-for-heart-failure/) |
| news-2026-10-09-affinia-aftx-201-hfsa-upbeat | [Affinia Therapeutics](https://affiniatx.com/affinia-therapeutics-aftx-201-and-upbeat-clinical-trial-in-bag3-dcm-featured-at-the-heart-failure-society-of-america-hfsa-annual-scientific-meeting-2026/) |
| news-2026-10-09-bayer-hfsa-reveal | [Bayer](https://www.bayer.com/en-us/united-states/news-and-stories/2026/heart-failure-data-at-hfsa) |
| news-2026-10-09-clasp-ii-tr-design | [American Heart Journal](https://www.sciencedirect.com/science/article/pii/S0002870326002899) |
| news-2026-10-09-mitral-stenosis-fsi-energetics | [Annals of Biomedical Engineering](https://link.springer.com/article/10.1007/s10439-026-04364-7) |
| news-2026-10-07-pediatric-asd-six-month-remodeling | [BMC Cardiovascular Disorders](https://link.springer.com/article/10.1186/s12872-026-06789-3) |
| news-2026-10-01-daxor-hfsa-2026-bva | [Daxor Corporation](https://daxor.com/daxor-to-showcase-next-gen-blood-volume-analyzer-new-clinical-data-at-hfsa-2026/) |
| news-2026-09-30-cytokinetics-launches-aspen-hcm | [Cytokinetics, Incorporated](https://ir.cytokinetics.com/press-releases/press-release-details/2026/Cytokinetics-Launches-ASPEN-HCM-A-Real-World-Study-Evaluating-MYQORZO-aficamten-in-Symptomatic-Obstructive-Hypertrophic-Cardiomyopathy/default.aspx) |
| news-2026-09-28-tempus-ecg-mr-fda-clearance | [Tempus AI, Inc.](https://www.tempus.com/news/pr/tempus-receives-fda-clearance-for-its-ecg-mr-ai-product-designed-to-identify-undiagnosed-mitral-regurgitation/) |
| news-2026-09-23-pascal-capture-clarity-mr-fda | [FDA openFDA](https://api.fda.gov/device/pma.json?search=pma_number:P220003+AND+supplement_number:S028&limit=1) |
| news-2026-09-18-hfsa-cmic-programme | [Heart Failure Society of America](https://www.prnewswire.com/news-releases/hfsas-2026-annual-scientific-meeting-to-feature-late-breaking-trials-that-could-reshape-heart-failure-treatment-302882718.html) |
| news-2026-08-31-cmic-iv-registration | [ClinicalTrials.gov](https://clinicaltrials.gov/study/NCT07795359) |
| news-2026-08-30-reveal-diagnostic | [JAMA](https://jamanetwork.com/journals/jama/article-abstract/2853272) |
| news-2026-08-26-cmic-follow-up | [European Journal of Heart Failure](https://academic.oup.com/eurjhf/advance-article/doi/10.1093/ejhf/xuag274/8771333) |
| news-2026-07-29-daxor-ezbva-kansas-outpatient-launch | [Daxor Corporation](https://daxor.com/daxor-broadens-outpatient-footprint-with-initiation-of-ezbva-lab-diagnostic-services-in-kansas/) |
| news-2026-07-27-dragonfly-t-teer-china-design | [JACC: Asia](https://www.jacc.org/doi/10.1016/j.jacasi.2026.06.012) |
| news-2026-07-22-affinia-aftx-201-orphan-drug | [Affinia Therapeutics](https://affiniatx.com/fda-grants-orphan-drug-designation-to-affinia-therapeutics-aftx-201-for-the-treatment-of-bag3-associated-dilated-cardiomyopathy-dcm/) |

### Graph additions

- conditions: `cond-hf`, `cond-bag3-dcm`
- companies: `co-tempus-ai`, `co-valgen-medtech`, `co-affinia-therapeutics`, `co-berlin-heals`, `co-cardurion`, `co-daxor`
- therapies: `dig-tempus-ecg-mr`, `dev-occlutech-asd`, `dev-laaguarder`, `dig-link-hf2-monitoring`, `dev-dragonfly-t`, `rx-aftx-201`, `dev-cmic`, `rx-tovinontrine`, `dev-daxor-bva-200`, `rx-i124-evuzamitide`
- trials: `trial-link-hf2`, `trial-teer-china`, `trial-upbeat-aftx-201`, `trial-cmic-ii`, `trial-cmic-iii`, `trial-cmic-iv`, `trial-cmic-ii-follow-up`, `trial-cycle-1-ref`, `trial-cycle-2-pef`, `trial-clasp-ii-tr`, `trial-reveal-i124`

### Atlas profiles and exact documentary locators

| Version | Sources and scope |
| --- | --- |
| ver-tempus-ecg-mr-k254297 | [U.S. Food and Drug Administration](https://www.accessdata.fda.gov/cdrh_docs/pdf25/K254297.pdf), PDF pp.1, 4–6: clearance letter; Indications for Use; 510(k) Summary, Indications and General Warnings/Precautions |
| ver-occlutech-asd-us-p200032 | [FDA](https://www.accessdata.fda.gov/cdrh_docs/pdf20/P200032B.pdf), SSED pp.1–2, Sections I, II and V |
| ver-laaguarder-lp01 | [LaaGuarder product brochure / Rumedlife host](https://rumedlife.com/upload/pdf/1752481236_LaaGuarder_Left_Atrial_Appendage_Closure_System_(1).pdf), PDF pp.2–4, Device Description, General Specifications/Ordering and Indications/Precautions |
| ver-pascal-ace-capture-clarity-mr | [FDA openFDA](https://api.fda.gov/device/pma.json?search=pma_number:P220003+AND+supplement_number:S028&limit=1), results[0].trade_name, decision_date, supplement_reason and ao_statement; official API inspected 2026-10-12 |
| ver-link-hf2-study-intervention | [VA / ClinicalTrials.gov](https://cdn.clinicaltrials.gov/large-docs/63/NCT04502563/Prot_SAP_001.pdf), Protocol4.0 pp.8,10–11: Operational Partner, clinical response and Study Device |
| ver-dragonfly-t-study-system | [JACC: Asia](https://www.jacc.org/doi/10.1016/j.jacasi.2026.06.012), Study device description; Figure1 caption |
| ver-aftx-201 | [ClinicalTrials.gov / U.S. National Library of Medicine](https://clinicaltrials.gov/study/NCT07426419), protocolSection.armsInterventionsModule.interventions[0] |
| ver-cmic-surgical-ii | [ClinicalTrials.gov](https://clinicaltrials.gov/study/NCT04662034), protocolSection.identificationModule; armsInterventionsModule; designModule.designInfo |
| ver-cmic-subcutaneous-iii | [ClinicalTrials.gov](https://clinicaltrials.gov/study/NCT06920030), protocolSection.identificationModule; armsInterventionsModule; designModule.designInfo |
| ver-cmic-subcutaneous-iv | [ClinicalTrials.gov](https://clinicaltrials.gov/study/NCT07795359), protocolSection.identificationModule; armsInterventionsModule; designModule.designInfo |
| ver-tovinontrine-crd750 | [Cardurion Pharmaceuticals](https://cardurion.com/cardurion-pharmaceuticals-presents-phase-2-results-for-tovinontrine-crd-750-a-pde9-inhibitor-as-a-novel-treatment-for-heart-failure/), Opening non-quotation paragraphs; CYCLE-1 REF and CYCLE-2 PEF results paragraphs; no complete numerical tables. |
| ver-daxor-bva-200 | [U.S. Food and Drug Administration / Daxor Corporation](https://www.accessdata.fda.gov/cdrh_docs/pdf26/K261099.pdf), PDF pp.1, 4–6: FDA decision; Indications for Use (p.4); device description and operator setting (pp.5–6); [U.S. Food and Drug Administration / Daxor Corporation](https://www.accessdata.fda.gov/cdrh_docs/pdf25/K251087.pdf), PDF pp.4–6: Indications for Use (p.4), device description and BVA-100 comparison (pp.5–6); 510(k) summary begins p.5 |
| ver-daxor-bva-100 | [U.S. Food and Drug Administration](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K964406), Device Name; 510(k) Number; Applicant; Decision Date; Decision; [U.S. Food and Drug Administration / Daxor Corporation](https://www.accessdata.fda.gov/cdrh_docs/pdf25/K251087.pdf), PDF pp.5–10: device description and comparison with BVA-100 predicate; summary begins p.5 |
| ver-i124-evuzamitide-reveal | [ClinicalTrials.gov](https://clinicaltrials.gov/study/NCT06788535), protocolSection identification/status/design/armsInterventions/outcomes modules; [JAMA](https://jamanetwork.com/journals/jama/article-abstract/2853272), Public Abstract: Design/Participants, Intervention, Main Outcomes, Results; [Bayer](https://www.bayer.com/en-us/united-states/news-and-stories/2026/heart-failure-data-at-hfsa), Dateline Oct 8, page header Oct 9; Key Facts; Cardiac Amyloidosis; About Investigational Iodine 124 Evuzamitide |

All 45 new authored source records retain source class/access, retrieval date, publication date where verified and exact identifiers; record-specific references carry locators. Undated brochure/source dates remain omitted. Full source list and new claims are in the catalog; cohort and outcome locators are in pilot. Private watchlist, raw source snapshots and tool logs remain ignored.

## Curator flags and limits

- Tempus K254297: FDA listing and signed PDF disagree on product code/submission receipt date. Those fields are omitted. Clearance date and intended-use scope agree; the model detects ECG signs, does not diagnose/rule out MR or direct treatment.
- PASCAL P220003/S028: official FDA API confirms the named MR system and design supplement. Exact components, material change and IFU remain unreviewed; no TR indication or inherited Precision specification.
- Occlutech ASD: initial US P200032 approval is December 2023. September 2026 DI is packaging/listing provenance, not a new generation or authorization. Pediatric Figulla Flex II evidence is a mixed-device cohort and not mapped to a US exact configuration.
- LaaGuarder: undated brochure and distributor wording conflict on anticoagulation eligibility. Manufacturer-hosted revision/certificate and jurisdiction remain unresolved; no approved-indication extraction.
- Cardurion: enrolled REF/PEF populations 557/303 differ from sponsor randomized 529/277. Biomarker reports are sponsor-attributed, with no numerical arm effect tables or registry results.
- LINK-HF2: registry 176 started versus 171 completed/analyzed; no hospitalization benefit established. Exact patch/software build and newly indexed October full paper are unresolved. Registry masking and secondary paper description differ.
- UPBEAT: September registry age 18–70 agrees with October sponsor release; July said 18–55. Amendment date unknown. Registry 22 is estimated; IND/designations are not marketing approval.
- CLASP II TR: estimated registry 1270 includes multiple arms/access cohorts; paper describes 450 randomized. Overall recruiting and completed randomized enrollment have different scopes. No efficacy readout or exact build mapping.
- C-MIC: surgical II/FU differs from subcutaneous III/IV. FU is uncontrolled, excludes post-reactivation efficacy visits and has endpoint-specific missingness; no III/IV outcomes inferred from planned HFSA sessions.
- REVEAL: registry 204 versus publication 195 enrolled/170 included are distinct. Abstract-only diagnostic results cover cardiac amyloidosis overall, not ATTR-only; no HFSA post-hoc results or therapeutic effect inferred.
- Daxor: BVA-100 and BVA-200 are distinct. FDA comparison measurements are not a patient-benefit endpoint and are not equated with an unlinked registry. Exact feature timing between BVA-200 submissions is unresolved.
- ACACIA-HCM/ASPEN and acoramidis EHR: conference release or launch scope retained; EHR association is observational, separate from the September claims study. Original HFSA result abstracts/ASPEN NCT not verified.

The existing News family trails group related versions and may order them by ID; their arrows are not independently verified chronology or participant-level device mappings. Exact evidence mappings and the limitations in each profile control interpretation.

The graph schema uses a legacy `treats` condition crosswalk for diagnostic/monitoring adjuncts; their descriptions and intelligence `clinicalRole: detects/monitors` retain the nontherapeutic scope.

### Held research leads

Primary access remains unresolved for DOAC-era LAAO meta-analysis (10.1016/j.ahjo.2026.100942), HALO-SCE (10.1093/eurheartj/ehag734), PDA ligation comparison (10.1038/s41598-026-72722-5), SAFE-PFO/Cocoon NCT07380490, Tendyne PMID42854830, TRI-FR PMID42850060, and GO-PEG-NH2 valve-material DOI10.1016/j.nano.2026.103037. No quantitative assertions from those leads were added. Date traps and duplicate decisions include TRIC-I-HF, PARTNER 3 issue dating, AUTUS, Amulet/Amulet 360, existing engineering preprints, and older WATCHMAN field actions. This bounded public-source scan is not an exhaustive global FDA/UDI export or systematic review.

## Validation and delegation

`npm run validate:local` passed: both typechecks, 102/102 tests, data compilation, repository safety scan and offline newsletter preflight. `VITE_BASE=/ npm run build` and `git diff --check` passed. Evidence review packet prepared. Browser verification passed for the review hub, eight current-window draft News stories, and the new Tempus Atlas and Data profile with source links and draft guidance. Final metadata correction separated original registry posting from current revisions; data validation and production build passed again. Screenshot: ignored `artifacts/research/2026-10-12/preview.png`.

Six fresh agents were used with bounded follow-ups: Luna for inventory/documentary extraction/duplicate checks; Sol for version/cohort reconciliation, integration proposals and final material-evidence review. Coordinating Sol verified material sources, preserved owner content, integrated once and ran checks. Agent review is not curator/author signoff. Factual review remains WOR-10; local-only results do not authorize publication or delivery.

## Owner-approved release

On October 12, the owner approved the local preview and authorized a GitHub PR and merge after review, explicitly excluding the weekly digest/newsletter. The owner separately confirmed publication of these 19 News stories. Only this run’s 19 News records were promoted to reviewed for the public News feed; the 14 Atlas profiles and remaining factual catalog/trial claims keep draft status and their documented limits. The compiled public News feed now has 86 stories. Local weekly browser/email previews and the review site, source snapshots, private watchlist and logs remain ignored and are excluded. No new public/digests files or editorial article changes are included. The release also includes the preexisting LAAO image provenance/caption improvements, source policy and T45 research notes approved for inclusion; historical draft notes above describe the local research handoff. Integration preserves current origin/main dependency, workflow and public-data-fetch updates.
