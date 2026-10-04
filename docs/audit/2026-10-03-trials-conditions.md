# Trial and condition audit — 2026-10-03

> Domain review notes from before final integration. See the [consolidated audit](../DATABASE_AUDIT_2026-10-03.md) for the applied corrections, subsequent primary-source checks, and remaining gaps. Candidate findings are archived in [2026-10-03-trials-conditions-findings.json](2026-10-03-trials-conditions-findings.json).


## Scope and method

Reviewed 72 trial records and 19 condition records in the working YAML. Registry IDs discovered in existing direct ClinicalTrials.gov URLs were not treated as verified solely because they appeared in a URL. The initial pass extracted 46 candidate NCT identifiers from existing references; the later identity sweep reopened each registry link and cross-checked matching study title/intervention against indexed ClinicalTrials.gov content, the matching original paper, FDA/CMS records, or sponsor primary pages. An ID was counted as verified only when that identity match was established; an extracted URL alone was not considered verification. Direct ClinicalTrials.gov pages often rendered only the page shell in this browser; where matching identity evidence was not available from an alternative primary source, the item remains a gap. This audit does not claim that every mutable registry field for all 71 original trial records was refreshed. All changed authored records remain draft, dated 2026-10-03; earlier sources and notes were preserved.

## Trial inventory — all inspected records

- trial-protect-af — corrected (NCT00129545)
- trial-prevail — corrected (NCT01182441)
- trial-prague-17 — corrected (NCT02426944)
- trial-amulet-ide — corrected (NCT02879448)
- trial-option — corrected (NCT03795298)
- trial-champion-af — corrected (NCT04394546)
- trial-lambre-ii — inspected (NCT07455539)
- trial-respect — corrected (NCT00465270)
- trial-reduce — corrected (NCT00738894)
- trial-close — corrected (NCT00562289)
- trial-explorer-hcm — inspected (NCT03470545)
- trial-valor-hcm — corrected (NCT04349072)
- trial-sequoia-hcm — corrected (NCT05186818)
- trial-maple-hcm — corrected (NCT05767346)
- trial-acacia-hcm — inspected (NCT06081894)
- trial-attr-act — inspected (NCT01994889)
- trial-attribute-cm — corrected (NCT03860935)
- trial-helios-b — corrected (NCT04153149)
- trial-apollo-b — corrected (NCT03997383)
- trial-paradigm-hf — inspected (NCT01035255)
- trial-dapa-hf — inspected (NCT03036124)
- trial-deliver — corrected (NCT03619213)
- trial-emperor-preserved — corrected (NCT03057951)
- trial-emperor-reduced — corrected (NCT03057977)
- trial-victoria — corrected (NCT02861534)
- trial-finearts-hf — corrected (NCT04435626)
- trial-galactic-hf — corrected (NCT02929329)
- trial-comet-hf — corrected (NCT06736574)
- trial-reduce-lap-hf-i — corrected (NCT02600234)
- trial-reduce-lap-hf-ii — corrected (NCT03088033)
- trial-responder-hf — corrected (NCT05425459)
- trial-relieve-hf — corrected (NCT03499236)
- trial-alt-flow-ii — inspected (NCT05686317)
- trial-champion — corrected (NCT00531661)
- trial-guide-hf — corrected (NCT03387813)
- trial-proactive-hf — corrected (NCT04089059)
- trial-cosira — corrected (NCT01205893)
- trial-cosira-ii — corrected (NCT05102019)
- trial-serra-i — gap (NCT06991322)
- trial-partner-2 — corrected (NCT01314313)
- trial-partner-3 — corrected (NCT02675114)
- trial-evolut-low-risk — corrected (NCT02701283)
- trial-early-tavr — corrected (NCT03042104)
- trial-progress — inspected (NCT04889872)
- trial-smart — corrected (NCT04722250)
- trial-acurate-ide — corrected (NCT03735667)
- trial-align-ar — corrected (NCT04415047)
- trial-everest-2 — corrected (NCT00209274)
- trial-coapt — corrected (NCT01626079)
- trial-mitra-fr — corrected (NCT01920698)
- trial-clasp-iid — corrected (NCT03706833)
- trial-triluminate — corrected (NCT03904147)
- trial-triscend-2 — corrected (NCT04482062)
- trial-adaptr-fih — inspected (NCT06368401)
- trial-summit — corrected (NCT03433274)
- trial-apollo-tmvr — corrected (NCT03242642)
- trial-encircle — corrected (NCT04153292)
- trial-harmony — corrected (NCT02979587)
- trial-closure-af — gap (no verified NCT ID)
- trial-luminara — corrected (NCT06299826 verified in its primary-results paper and matched to study identity)
- trial-pld-multicenter — gap (no verified NCT ID)
- trial-rechord — inspected (NCT02803957)
- trial-mi-chord-pilot — gap (no verified NCT ID)
- trial-tricaval — inspected (NCT02387697)
- trial-alive-revivent — corrected (NCT02931240; 126 in primary paper)
- trial-peerless-hf — corrected (NCT00382863; 210 in primary-paper population, enrollment discrepancy noted)
- trial-acorn-corcap — corrected (no NCT assigned; 107-person no-MVR stratum verified in primary follow-up paper)
- trial-corcinch-hf — inspected (NCT04331769)
- trial-tricento-registry — gap (no verified NCT ID)
- trial-kiss-pvl — gap (no verified NCT ID)
- trial-momentum-3 — corrected (NCT02224755)
- trial-summit-tirzepatide — added; verified NCT04847557

## Conditions inventory — all inspected records

- cond-af — anatomy retained; sourced to the 2023 ACC/AHA/ACCP/HRS AF guideline; draft dated 2026-10-03.
- cond-pfo — anatomy retained; sourced to the SCAI PFO guideline and official guideline release; draft dated 2026-10-03.
- cond-asd — anatomy retained; sourced to 2025 ACC/AHA adult congenital heart disease guideline; draft dated 2026-10-03.
- cond-vsd — description narrowed to distinguish congenital defect from rare post-MI rupture and qualify selected transcatheter treatment; sourced to 2025 ACHD and 2025 ACS guidelines.
- cond-pda — description corrected to avoid calling closure standard for all preterm infants; sourced to 2025 ACHD guideline and AAP 2025 clinical report.
- cond-hcm — anatomy retained; sourced to 2024 AHA/ACC HCM guideline; draft dated 2026-10-03.
- cond-attr-cm — anatomy retained; sourced to 2023 ACC cardiac amyloidosis consensus; draft dated 2026-10-03.
- cond-hfref — definition retained at LVEF <=40%; removed unsupported hemodynamic-monitoring characterization; sourced to 2022 AHA/ACC/HFSA HF guideline.
- cond-hfpef — definition retained at LVEF >=50%; removed interatrial shunts from general “emerging therapies” wording to avoid implying efficacy; sourced to 2022 AHA/ACC/HFSA HF guideline.
- cond-cmd — anatomy retained; sourced to the 2024 ESC chronic coronary syndromes guideline on coronary microvascular dysfunction.
- cond-as — anatomy retained; sourced to 2025 ESC/EACTS valve guideline; refreshed prior CMS note using the final 2026-09-10 NCD: symptomatic severe AS covered without CED, asymptomatic severe AS only under CMS-approved CED and device-specific FDA indications; proposal sources retained as historical.
- cond-ar — anatomy retained; sourced to 2025 ESC/EACTS valve guideline.
- cond-mr — anatomy retained; sourced to 2025 ESC/EACTS valve guideline.
- cond-ms — anatomy retained; sourced to 2025 ESC/EACTS valve guideline.
- cond-tr — anatomy retained; sourced to 2025 ESC/EACTS valve guideline.
- cond-pv — anatomy retained; sourced to 2025 ACC/AHA adult congenital heart disease guideline.
- cond-pvl — source-to-anatomy checked against 2022 PVL review; corrected category to Prosthetic valve complication and anatomy to include native annulus; kept prior citations (the second PMC source was inaccessible during this pass).
- cond-ischemic-lv-remodeling — existing definition/anatomy supported by prior source and 2025 ALIVE primary publication; source set expanded and date refreshed.
- cond-hypertension — new draft hypertension condition retained; systemic arterial and LV anatomy with ESC 2024 and AHA/ACC 2025 sources; does not assert HFpEF efficacy.

All 18 pre-existing condition nodes now have source lists; all edited condition nodes remain draft with lastUpdated 2026-10-03.

## Confirmed additions and corrections

The original 46 direct-link IDs were not treated as verified merely because the NCT string appeared in a reference. Matching identity was checked against indexed ClinicalTrials.gov content, a matching original paper, FDA/CMS materials, or sponsor primary pages; where that matching evidence could not be established, the record remains marked as a gap or provisional. This supports identity matching only, not a refresh of every mutable registry field. Added IDs: trial-protect-af (NCT00129545), trial-prevail (NCT01182441), trial-prague-17 (NCT02426944), trial-amulet-ide (NCT02879448), trial-option (NCT03795298), trial-champion-af (NCT04394546), trial-respect (NCT00465270), trial-reduce (NCT00738894), trial-close (NCT00562289), trial-valor-hcm (NCT04349072), trial-sequoia-hcm (NCT05186818), trial-maple-hcm (NCT05767346), trial-attribute-cm (NCT03860935), trial-helios-b (NCT04153149), trial-apollo-b (NCT03997383), trial-deliver (NCT03619213), trial-emperor-preserved (NCT03057951), trial-emperor-reduced (NCT03057977), trial-victoria (NCT02861534), trial-finearts-hf (NCT04435626), trial-galactic-hf (NCT02929329), trial-reduce-lap-hf-i (NCT02600234), trial-reduce-lap-hf-ii (NCT03088033), trial-relieve-hf (NCT03499236), trial-champion (NCT00531661), trial-guide-hf (NCT03387813), trial-proactive-hf (NCT04089059), trial-cosira (NCT01205893), trial-cosira-ii (NCT05102019), trial-partner-2 (NCT01314313), trial-partner-3 (NCT02675114), trial-evolut-low-risk (NCT02701283), trial-early-tavr (NCT03042104), trial-smart (NCT04722250), trial-acurate-ide (NCT03735667), trial-align-ar (NCT04415047), trial-everest-2 (NCT00209274), trial-coapt (NCT01626079), trial-mitra-fr (NCT01920698), trial-clasp-iid (NCT03706833), trial-triluminate (NCT03904147), trial-triscend-2 (NCT04482062), trial-summit (NCT03433274), trial-apollo-tmvr (NCT03242642), trial-encircle (NCT04153292), trial-harmony (NCT02979587), trial-comet-hf (NCT06736574). In particular, Tendyne SUMMIT is NCT03433274; it is distinct from the tirzepatide HFpEF SUMMIT trial (NCT04847557), added here as trial-summit-tirzepatide and cross-identified by its primary NEJM paper and Lilly trial page.

Added missing COMET-HF as trial-comet-hf, NCT06736574. The official ClinicalTrials.gov record identifies the confirmatory phase 3 omecamtiv mecarbil/placebo HFrEF trial, recruiting, with actual start 2024-12-19 and estimated enrollment 1,800. Enrollment is estimated, not actual. Sources: https://clinicaltrials.gov/study/NCT06736574 and the Cytokinetics start announcement recorded in YAML.

Corrected MAPLE-HCM to completed and 175 randomized participants; its analyzed cohort is 175. Corrected TRISCEND II enrollment from 400 to 864 actual; the official registry result calls it active, not recruiting. Corrected CHAMPION-AF and Harmony to reflect ongoing registry follow-up rather than infer status from published readouts. ACURATE IDE is shown ongoing based on its primary publication, but enrollment remains unresolved because the 1,500 randomized primary cohort is not the whole-study registry total.

Corrected RESPONDER-HF to Corvia’s current sponsor description: 260 participants randomized 1:1 and “In Follow-up”; clarified eligibility (HFpEF/HFmrEF, LVEF ≥40%), first and recurrent HF-event timing through 24 months, 12-month KCCQ endpoint, and secondary cardiovascular death endpoint. The old 750 enrollment goal was stale. No efficacy/readout claim was carried over from the earlier responder subgroup. Source: https://us.corviamedical.com/healthcare-professionals/reduce-lap-hf-clinical-program/responder-hf/.

Added cond-hypertension (Systemic hypertension) with systemic arterial circulation and left-ventricle anatomy, using ESC 2024 and AHA/ACC 2025 guideline sources. This provides a hypertension graph target for Hello Heart and does not assert HFpEF treatment efficacy.


Filled enrollments only from a directly read primary record or paper, with denominators explicitly distinguished: COSIRA-II 380 estimated across randomized and nonrandomized registry arms (CTG); ACURATE IDE 1,500 randomized in the primary paper (a reproduced registry total of 1,948 could not be checked in the accessible primary registry and is not used); Tendyne SUMMIT 958 planned across its multi-cohort program (sponsor protocol); Harmony TPV 86 actual registered participants; ALIVE 126 total actual in the primary paper (84 device/42 nonrandomized control); PEERLESS-HF 210 reported in the primary publication (a secondary account says 217 enrolled and a protocol target was 272, discrepancy unresolved); Acorn 107 actual in the no-MVR stratum (57/50; 50 completed five years); MOMENTUM 3 1,028 randomized in the pivotal IDE cohort. APOLLO TMVR and ENCIRCLE enrollment remain blank: third-party mirrors report 1,056 and 900 respectively, but the former has no primary exact cohort total verified here and FDA SSED directly supports 299 treated in ENCIRCLE’s main cohort; the full-program 900 estimate could not be verified in the accessible primary registry.

Corrected generation mapping: Amulet IDE comparator and PRAGUE-17 Watchman link to original Watchman rather than later FLX; PARTNER 2A links to SAPIEN XT (its SAPIEN 3 registry cohort is separate from the randomized comparison); Evolut Low Risk used CoreValve/Evolut R/PRO and is mapped to the broad lineage, not FX/FX+.

LUMINARA is now linked to NCT06299826 based on its primary Circulation results paper, which reports 375 randomized participants (235 and 140 across cohorts); its design article’s approximate plan was ~360. Timeline start 2024-06-04 is sourced to the matching CTG record. The tirzepatide SUMMIT node has NCT04847557, 731 randomized, and sponsor-reported completion date 2024-07-02; Tendyne SUMMIT remains separate. COMET-HF is NCT06736574, estimated registry enrollment 1,800 and actual start 2024-12-19. RESPONDER-HF sponsor reports 260 participants randomized and study “In Follow-up”; CMS’s IDE listing corroborates NCT05425459 but is not a coverage-approval finding.

## Unresolved gaps and cautions

- No verified NCT ID established for CLOSURE-AF, the Occlutech PLD multicenter study, Mi-CHORD safety cohort, the TRICENTO registry, or KISS PVL registry. The five-year Acorn no-MVR cohort also remains without an ID: NCT00630266 is explicitly cited as a different 50-person confirmatory study.
- SERRA-I retains NCT06991322 provisionally, but an associated reference also names NCT07449325; do not resolve the conflict by guessing.
- Enrollment remains unresolved for APOLLO TMVR and ENCIRCLE full-program totals; no primary-source exact total was confirmed. Timelines remain absent for CLOSURE-AF, the Occlutech PLD multicenter study, ReChord, Mi-CHORD, TRICAVAL, CORCINCH-HF, TRICENTO, and KISS PVL. The Acorn no-MVR study and PLD/registry records have no independently verified NCT IDs. These fields remain blank rather than inferred.
- Enrollment counts are not interchangeable across registry total, randomized cohort, and publication analyzed cohort. Explicitly distinguished values include MAPLE-HCM 175 randomized, TRISCEND II 864 actual, RESPONDER-HF 260 randomized, COMET-HF 1,800 estimated, and the trial-specific cohorts listed above. ACURATE IDE’s 1,500 randomized primary-paper cohort is not represented as a verified registry total.
- Tendyne SUMMIT and tirzepatide HFpEF SUMMIT are separate studies; no relationship was inferred between them.
- The condition inventory has 19 records and all have anatomy values. Sources were added to all 16 previously unsourced nodes; the two pre-sourced nodes were rechecked and updated. cond-pvl is classified as a prosthetic-valve complication to cover both mitral and aortic leaks. The second pre-existing PVL citation was inaccessible, but the 2022 review independently supports the definition and anatomy.
- Suspended or terminated statuses remain study-specific and registry-sourced. Do not generalize these to therapy retirement. TRICAVAL (NCT02387697) is terminated after safety events; PEERLESS-HF (NCT00382863) is terminated after interim futility; CORCINCH-HF (NCT04331769) is suspended, not terminated. These statuses do not establish therapy-wide withdrawal.

## Source and promotion boundary

This is a draft audit. No record was promoted to curated, no unverified identifier or date was invented, no status was inferred from a readout, and no company or therapy record was edited. Parent-level final inventory/validation remains outstanding.
