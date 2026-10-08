# October 7, 2026 research handoff

[WOR-26](https://linear.app/workspace-visualize-sh/issue/WOR-26/research-october-7-developments-and-update-news-atlas-and-data-drafts)
tracks the research deliverable in `P-WOR-1`. At the October 7 handoff, all new
factual records were **draft** and the owner approved an origin push that
preserved draft status. On October 8, the owner reviewed and approved publication
of this round's 12 News items under WOR-10; those items are now **reviewed**.
Atlas/Data evidence and unrelated held News retain their existing review states.
Authored article drafts remain unchanged. Newsletter delivery is not authorized.

## Scope and deliverables

The round checked public documentary evidence across pulmonary/congenital valves,
TAVR and embolic protection, mitral repair, LAAO safety, heart-failure monitoring,
HCM, ATTR-CM, valve materials and computational/imaging research. The main News
window follows the existing September 23 feed through October 7. Two explicitly
historical gaps were also filled: MitraPatch's 2025 clearance in Data and the
August CARDIO-TTRansform publication in News.

Added: 12 News drafts, 2 companies, 4 graph therapies, 2 graph trials, 18 source
records, 4 evidence families/versions, 26 claims, 3 regulatory decisions, 2 trial
snapshots, 8 events and 7 bibliography records. Existing Mitria and CAMZYOS
records were reused without rewriting them. Atlas and Data receive the same
version/source-linked evidence; the graph payload retains draft markers.
Draft News is intentionally excluded from the normal public News feed until
curator promotion; the 12 approved items now compile into that feed. The research
branch includes the existing Mitria graph/catalog
prerequisite from WOR-25, which was not yet committed. Other earlier local edits
are outside this push; its JSON payloads are regenerated from the branch's YAML.

| Finding | Documentary anchor and locator | Integration and limits |
| --- | --- | --- |
| AUTUS, October 1 | [FDA approval announcement](https://www.fda.gov/news-events/press-announcements/fda-approves-first-heart-valve-designed-grow-children), implantation/diameter, leaflet, clinical-study and approval-recipient paragraphs; [Edwards announcement](https://ir.edwards.com/news/news-details/2026/Edwards-Lifesciences-Receives-FDA-Approval-for-AUTUS-Valve-the-First-Surgical-Pulmonary-Valve-for-Pediatric-Patients/default.aspx) | `dev-autus`, `ver-autus-size-adjustable`, News and approval event. Surgical implantation with subsequent balloon expansion, approximately 13–22 mm. PMA identifier, approved IFU, frame alloy and polymer chemistry remain unverified. No autonomous growth or long-term expansion benefit inferred. |
| AUTUS studies | [NCT05006404](https://clinicaltrials.gov/study/NCT05006404) and [NCT07466745](https://clinicaltrials.gov/study/NCT07466745), official API identification, status, design, outcomes and eligibility modules | `trial-autus-pivotal` / `evidence-autus-pivotal`: 62 actual, active not recruiting; `trial-autus-continued-access` / `evidence-autus-continued-access`: 36 estimated, recruiting. Separate October 7 observations preserve registry posting dates, actual/estimated completion dates and no posted results. Trial age eligibility is not treated as approved labeling. |
| Mitria/T45, September 29 | [Original corporate release](https://www.prnewswire.com/news-releases/mitria-medical-partners-with-t45-labs-to-advance-novel-mitral-valve-repair-therapy-302889421.html), opening paragraphs, non-quotation cumulative-recipient paragraph and investigational disclaimer | News and `event-mitria-t45-partnership-ceo-20260929` reuse `ver-mitria-svs`. Six recipients is an unspecified sponsor count; build, access-route mix, cohort cutoff, registry ID and efficacy remain unknown. No commercial authorization inferred. |
| CardioGuide HF, October 5 | [Abbott announcement](https://abbott.mediaroom.com/2026-10-05-Abbott-receives-FDA-approval-for-new-CardioMEMS-HF-System-capabilities-that-help-patients-engage-in-the-care-of-their-heart-condition), opening, Dynamic Treatment Plan, availability paragraphs and FAQs | `dig-cardioguide-hf`, announced software version, claim/event and News. Patient pressure access and clinician-configured instructions; availability planned later in 2026. Exact software build, FDA supplement and hardware compatibility remain unverified. |
| Emboliner | [FDA K261715](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?id=K261715), Device Name, Decision Date and classification; [October 2 release](https://www.prnewswire.com/news-releases/emboline-announces-first-us-commercial-use-of-the-emboliner-embolic-protection-system-302896963.html), opening non-quotation and controlled-launch paragraphs | `co-emboline`, `dev-emboliner`, `ver-emboliner-epc03`, decision and News. September 8 clearance, October 1 procedures and October 2 announcement are separate. Temporary TAVR adjunct; exact IFU, materials/profile, broad availability and stroke-prevention benefit not established. |
| CAMZYOS, September 30 | [FDA pediatric approval notice](https://www.fda.gov/drugs/news-events-human-drugs/fda-approves-first-drug-improve-functional-capacity-and-symptoms-children-rare-inherited-heart), indication, SCOUT-HCM and safety paragraphs | News/event reuse existing September label and decision. Pediatric indication requires weight at least 30 kg; trial age eligibility is separate. Monitoring and REMS remain relevant. |
| Amulet safety labeling | [FDA P200049/S021](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?ID=P200049S021), Decision Date and Approval Order Statement; [Abbott September letter](https://www.cardiovascular.abbott/content/dam/cv/cardiovascular/pdf/reports/Customer%20Letter%20-%20Amplatzer%20Amulet%20Left%20Atrial%20Appendage%20Occluder.pdf), PDF pp.1, 3; [Health Canada RA-82682](https://recalls-rappels.canada.ca/en/alert-recall/amplatzertm-amulettm-left-atrial-appendage-occluder), Affected products, Issue and Details | US decision August 28; customer-letter date September at month precision; Canadian recall September 10, published September 25. News uses the Canadian publication date. Pulmonary-artery assessment update is scoped to original 9-ACP2 models. Canada's Type II labeling classification is not transferred to the US or Amulet 360; no global product withdrawal inferred. |
| MitraPatch historical backfill | [FDA K252126 PDF](https://www.accessdata.fda.gov/cdrh_docs/pdf25/K252126.pdf), p.1 clearance, p.4 indication, pp.5–6 summary | `co-chawla-heart-technologies`, `dev-mitrapatch`, version/specs and December 4, 2025 decision. Chawla Heart Technologies ePTFE monomembrane for marginal/primary chordae only; separate from Mitria. No current launch or human outcome evidence verified. No current News item created. |
| TAVR bench FSI, October 2 | [arXiv 2610.03297 v1](https://arxiv.org/abs/2610.03297v1), Abstract Methods/Results/Conclusion; Methods device description | News/bibliography, entity-only Evolut link. Conditional bench validation with measured forcing, not clinical prediction. The 26 mm Evolut R specimen is not mapped to FX/FX+. |
| Mitral TEER simulation, September 28 | [arXiv 2609.34209 v1](https://arxiv.org/abs/2609.34209v1), abstract repair formulation and reconstruction/convergence paragraphs | News/bibliography with entity-only MitraClip context. Penalty-enforced coaptation does not model a specific clip generation; simulated repairs are not clinical outcomes. |
| EchoDino | [arXiv 2610.05603 v2](https://arxiv.org/abs/2610.05603v2), Abstract and Submission History | News first-submission date October 4; source/bibliography revision October 7. Pediatric/adult dataset evaluation, not established clinical deployment. No marketed software version invented. |
| Puerarin valve-material coating, September 29 | [PubMed 42810482](https://pubmed.ncbi.nlm.nih.gov/42810482/), abstract and electronic article date; DOI `10.1016/j.actbio.2026.09.046` | News/bibliography: hydrogel-coated porcine pericardium and 12-week rat subcutaneous findings. Abstract only; no human durability conclusion. Separate from the earlier diclofenac nanogel paper. |
| Septal-balloon TEER bailout, September 24 | [PubMed 42782237](https://pubmed.ncbi.nlm.nih.gov/42782237/), abstract; DOI `10.1016/j.jaccas.2026.110445` | News/bibliography: one procedural case, abstract only. Exact PASCAL generation and septal-occluder model undisclosed; no comparative claim. |
| CARDIO-TTRansform August backfill | [UCL accepted-version abstract](https://discovery.ucl.ac.uk/id/eprint/10230315/), Abstract; [original DOI](https://doi.org/10.1038/s41591-026-04670-6); publisher-deposited Crossref `published-online` date | August 30 News/bibliography. Overall neutral trial; prespecified background-stabilizer subgroup interaction is not overall treatment benefit. No nonexistent eplontersen graph/trial IDs created. |

## Provenance, review and held leads

All sources used here are public regulator/registry documents, original written
manufacturer releases, original preprints, or public original-article abstracts.
Material claims carry exact locators in authored YAML. Existing source metadata
is preserved; this round's reinspection date is October 7. New source records
retain publication precision separately from retrieval and event/registry dates.
Only original concise summaries, links and metadata enter the repository. No
full text, figures, recordings, interview quotations or licensed exports were
added to public assets. Public accessibility is not a figure-reuse license.

Luna handled a bounded inventory and engineering-paper pass; Sol handled AUTUS
generation/cohort reconciliation and material factual review. The coordinator
inspected the material primary claims and integrated once. Agent review supplies
neither curator approval nor authorization to publish.

Held: the Frontiers TPU/SEBS lead has an acceptance date but no verified publication
date, so no dated News item was invented. No new independently documented Laminar
milestone was verified; existing held evidence is preserved. No verified Mitria
registry identifier or acquisition was added. The undated Edwards AUTUS study
page still describes investigational continued access; it is retained with its
limited study scope rather than allowed to override the dated FDA approval.

## Files, local review and validation

Authored changes: `data/news.yaml`, `data/companies.yaml`, `data/therapies.yaml`,
`data/trials.yaml`, `data/intelligence/pilot.yaml`,
`data/intelligence/taxonomy.yaml`, plus new
`data/intelligence/catalog/pulmonary-autus.yaml` and
`data/intelligence/catalog/research-2026-10.yaml`. Generated payloads:
`public/graph.json`, `public/intelligence.json`.

The taxonomy adds surgical pulmonary valves separately from transcatheter
pulmonary valves, an embolic-protection category, and an adjustable-diameter
attribute. Existing schema fields support the additions; no schema, types or
validator changes were needed for this round.

Ignored local artifacts under `artifacts/research/2026-10-07/`:

- `news-review.html`: all 12 News drafts for reading before promotion.
- `round-review.json`: only this round's evidence, News and source records.
- `round-manifest.json`: exact added IDs by authored collection.
- `evidence-review-packet.json`: the standard broader curator packet.
- `baseline/`: starting copies used to verify preservation; raw public registry
  responses and inspected public documents remain local.

Validation: `npm run build:data`, `npm run validate:local`,
`VITE_BASE=/ npm run build`, and `git diff --check`. A separate baseline comparison
confirms every pre-existing News/company/therapy/trial and pilot evidence record
is preserved, and `data/editorial-issues.yaml` is byte-identical. The owner's
other pre-existing working-tree changes remain in place. No article drafts were
edited. The initial origin push preserved draft status; the October 8 News
approval and promotion are recorded below.

## October 8 News approval

The owner explicitly reviewed and approved the new research News items in this
chat on October 8, 2026, requesting that they appear on the live News page.
[WOR-10](https://linear.app/workspace-visualize-sh/issue/WOR-10/complete-curator-review-of-draft-catalog-claims-and-held-news)
records the decision. Only `reviewStatus` changes from `draft` to `reviewed` for
the following 12 IDs; their copy, dates, documentary citations and limitations
above are preserved:

- `news-2026-10-05-cardiomems-cardioguide-patient-access`
- `news-2026-10-04-echodino-pediatric-echo-foundation-model`
- `news-2026-10-02-emboliner-first-us-commercial-use`
- `news-2026-10-02-tavr-fsi-bench-validation`
- `news-2026-10-01-autus-fda-approval`
- `news-2026-09-30-camzyos-pediatric-indication-expansion`
- `news-2026-09-29-mitria-t45-svs-partnership`
- `news-2026-09-29-puerarin-artificial-plasma-bhv-coating`
- `news-2026-09-28-immersogeometric-mitral-teer-model`
- `news-2026-09-25-amulet-canada-labeling-notice`
- `news-2026-09-24-parallel-septal-balloon-occlusion-mteer-case`
- `news-2026-08-30-cardio-ttransform-stabilizer-subgroup`

The newest approved story is October 5; the August 30 backfill retains its actual
publication date. Forty-six unrelated held News items remain draft. This approval
does not promote Atlas/Data claims or authored articles, or authorize a send.

The backfill's existing DOI citation has an explicit source record carrying the
October 7 retrieval date, so compiled bibliography metadata does not infer a
retrieval date from the August publication date. This adds citation metadata only;
the clinical interpretation remains limited to the reviewed UCL accepted-version
abstract and does not imply review of the publisher's full text.

Live verification after publication also found that ordinary page reloads could
reuse the previous JSON payload for the host's ten-minute cache lifetime. The app
now revalidates graph and intelligence JSON on load using `cache: 'no-cache'`,
preserving conditional caching while checking for newly published data.
