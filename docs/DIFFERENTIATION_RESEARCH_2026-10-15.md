# Three additions that could differentiate VISUALIZE-SH

Research date: October 15, 2026, America/Los_Angeles. **Draft strategy for owner review.**
Tracked in [WOR-36](https://linear.app/workspace-visualize-sh/issue/WOR-36/identify-three-differentiated-analytics-additions-from-commercial), project P-WOR-1.

## Recommendation

Build around three questions the present catalog does not yet answer:

1. **Design evidence maps:** What evidence supports a design choice, what tradeoffs were actually tested, and which links to clinical performance remain unproven?
2. **Living evidence and obligation tracking:** What changed, which of our interpretations need reconsideration, and which post-approval questions remain open?
3. **Approval-to-practice analysis:** Beyond the label, what coverage and operational conditions govern use, and what can public data actually tell us about practice?

The first is the strongest identity for the product. The second makes that identity maintainable and gives readers a reason to return. The third broadens usefulness to clinical programs and leadership. Start the third with policy and operational evidence; utilization is a separate, conditional extension.

The opportunity is an inspectable structural-heart argument: question, evidence, applicability, uncertainty, and the next observation that would change the interpretation. Generic AI answers, a larger catalog, another catalyst calendar, and adverse-event leaderboards are weaker investments.

These rankings are strategic judgments, not validated customer demand or proof that commercial products lack similar capabilities. No purchase, implementation, schedule, catalog promotion, or publication is authorized by this memo.

## What was examined

The review covered ten commercial products/platforms across market intelligence, materials information, safety/technology evaluation, and regulated workflows. Public vendor documentation establishes advertised functionality; it does not establish accuracy, customer outcomes, exact structural-heart coverage, or the contents of subscription databases. No paid workspace, sales demo, or proprietary export was inspected. Prices and ROI claims were not used in prioritization.

One Luna agent performed a bounded repository inventory. One Sol agent researched six adjacent commercial products, then was reused for an adversarial review. The coordinator checked the implementation, material primary-source examples, and integration decisions. No interviews, recordings, or transcripts were used. All external documents cited below were accessed publicly on October 15, 2026; publication dates and exact locators are recorded in the source register. Undated means publication date not established, not a claim that the content is timeless.

### Baseline: avoid rediscovering existing work

| Already implemented | Actual increment required |
| --- | --- |
| Exact versions, source-located specifications, configuration observations, explicit gaps, comparability and exports | Question-specific synthesis and explicit evidence relationships, beyond another table or gap color |
| Cohorts, endpoints, readouts, outcome context, regulatory decisions, lineage and dated events | Applicability reasoning and documented evidence bridges, beyond another timeline |
| Immutable FDA/ClinicalTrials.gov snapshots, normalized field deltas, document hashes and a draft review queue | Reviewed consequences for dependent claims and conclusions; new obligation records |
| Manual News Insights with run windows, citations and local previews | Persistent analytical objects that News Insights can reference and update |

Implementation checked in [`src/data/comparison.ts`](../src/data/comparison.ts), [`src/data/intelligence.ts`](../src/data/intelligence.ts), [`src/components/intelligence/DataWorkspace.tsx`](../src/components/intelligence/DataWorkspace.tsx), [`scripts/intelligence/snapshot.ts`](../scripts/intelligence/snapshot.ts), [`schema/intelligence.schema.json`](../schema/intelligence.schema.json), and [`docs/NEWS_INSIGHTS_WORKFLOW.md`](NEWS_INSIGHTS_WORKFLOW.md). The [comparison model](COMPARATIVE_DATA_MODEL.md) explicitly distinguishes an extraction-date view from reconstruction of historically valid labeling.

The current committed payload contains **133 versions, 789 claims and 31 trial snapshots**. Of the claims, **754 are marked draft and 35 reviewed**; these are software status counts, not an independent audit of reviewer approval. Counts were read from `public/intelligence.json`, superseding older pilot counts in status documentation. The implication is a capacity constraint: additional automated extraction will increase review debt unless the pilots are deliberately narrow.

## Commercial landscape: what users already pay for

The last column is our interpretation. None of these rows claims a vendor is incapable of the proposed features.

| Product and documentary source | Advertised capability inspected | Competitive implication for VISUALIZE-SH |
| --- | --- | --- |
| [Clarivate Medtech 360 / Data Explorer][C1] | Segment/geography analysis, forecasts, market shares, custom saved/shared views; download/integration options depend on offering | Competing on market breadth or an interactive market chart is weak. Its analyst-curated data and forecasting operation cannot be recreated by combining public device counts. |
| [GlobalData Medical Devices][C2] | Pipeline/product search, procedure and sales analysis, development/approval analyzers, and signals from deals, filings, jobs and patents | Alternative signals and AI synthesis are already commercial territory. A narrow question with an auditable engineering and clinical rationale is a more credible opening than generic competitive intelligence. |
| [Meddevicetracker][C3] | Public reports, events and expected catalyst ranges; the 2024 guide documents product/trial/event search and analyst assistance | A catalyst calendar would be familiar, not distinctive. Add consequences and unresolved questions to a milestone. The current homepage carries Evaluate/Norstella branding; the older guide carries Citeline branding. |
| [Definitive Healthcare][C4] | Claims, affiliations, commercial segmentation, medical affairs and market-access analysis | Its sales value rests partly on data and linkage unavailable in public aggregate files. Public Medicare services cannot substitute for all-payor claims, branded implant share, or referral journeys. |
| [Ansys Granta MI Enterprise][C5] | Materials/test-data management, process/property relationships, controlled workflows and CAD/CAE/PLM integration | Learn traceability and condition-specific data. Do not promise qualified material selection, enterprise design allowables, or simulation inputs from public implant descriptions. |
| [Total Materia Horizon][C6] | Property searches preserve material condition, test type, temperature and strain rate; cross-referenced results are distinguished | A material name is a poor comparison key. A finished component's form, processing, environment and measurement conditions must remain explicit or unknown. |
| [ECRI Evaluate Technology][C7] | Original device testing, methodological evaluations, clinical evidence assessment and incident investigation | Original testing and expert authority are substantial assets. A public synthesis should expose evidence boundaries rather than imitate a five-star product score. Exact structural-heart testing coverage was not established. |
| [Device Events][C8] | Consolidates FDA reports/recalls, search, trend views and notifications | Cleaner public-data retrieval is useful but already sold. Better search does not repair the epidemiological limits of spontaneous reports. |
| [Rimsys][C9] | Product/submission/regulatory relationships and change operations; source-linked regulatory AI; a planning product links to beta access | Traceable answers and task context matter. Global regulatory operations require records and specialist maintenance beyond this public atlas. Do not treat the beta offering as established general availability. |
| [Greenlight Guru][C10] | Links product, risk, quality events, changes and releases; controlled records and source-linked QMS search | Learn how evidence connects to decisions. Public sources cannot establish a manufacturer's internal verification completion, risk controls or compliance. An exportable public evidence packet could complement such systems. |

**Critical reading:** “source linked,” “AI powered,” charts, and connected records are already table stakes in this comparison set. Our plausible advantage is structural-heart depth, accessible original synthesis, exact scope, and transparent uncertainty. That advantage must be demonstrated in real tasks; it is not established by a marketing comparison.

## Iterative refinement and selection

| Initial candidate | Objection that changed the design | Refined decision |
| --- | --- | --- |
| Materials-to-outcomes graph | Geometry, processing, anatomy and technique confound relationships; arrows can imply causality | Select #1, with separate engineering and clinical lanes, documented bridges and question-specific conclusions |
| Automatic change alerts | Substantially duplicates the existing snapshot queue and WOR-13 | Select #2 only as reviewed consequence tracking plus evidence obligations; reuse the queue |
| Geographic adoption/opportunity map | Claims are not unique implants, unmet need, brand share, or demonstrated access barriers | Select #3 as coverage/operational analysis first; release utilization only after a separate methods gate |
| Trial-population/applicability explorer | High clinical value, but already has cohort/outcome primitives and overlaps #1's interpretation requirements | Incorporate applicability into #1; reconsider as a separate product if clinician testing supports it |
| Safety leaderboard from MAUDE | Missing exposure denominators and reporting biases make comparative rates untenable | Reject. Use regulator actions and carefully attributed report themes only as review leads [P6]. |
| General chatbot, approval prediction, digital twin, broad patent landscape | Crowded category; insufficient validated training data, product linkage or finished-component parameters | Defer. Citation retrieval is an interface convenience; unsupported prediction is not a differentiator. |

The Sol reviewer preferred a standalone applicability lens over #3 and judged #2 weak as an independent flagship. The coordinator accepts the maintenance critique, merges applicability into #1, and retains a smaller #3 because it introduces a distinct community question: the practical conditions between authorization and use. If policy cards do not change a clinical-program decision, stop before building maps. This dissent remains unresolved by user research.

| Final addition | Distinctiveness judgment | Main value | Main constraint |
| --- | --- | --- | --- |
| 1. Design evidence maps | High, conditional on expert synthesis | Research/design decisions and clinical interpretation | Sparse public engineering evidence and expert review time |
| 2. Living evidence/obligations | Medium alone; high supporting #1 | Trust, repeat use and conclusion maintenance | Noise, identity reconciliation and ongoing triage |
| 3. Approval-to-practice analysis | Medium; stronger when tied to exact evidence | Program planning and understanding implementation conditions | Policy expertise; public utilization's limited scope |

## 1. Design evidence maps

**Reader question:** “What evidence supports this design rationale, under what conditions was it tested, and what clinical question does it actually resolve?”

Start with a question rather than a sprawling graph. A card has two lanes:

- **Engineering:** exact version/configuration → component/material/processing disclosure → attributed design rationale → test question, method, conditions, comparator and result/disclosure state.
- **Clinical:** exact study/cohort → anatomy, indication, exclusions, endpoint, denominator and follow-up → finding and applicability limitations.

A link between lanes requires an explicit supporting document. Manufacturer rationale, experimental finding, regulator applicability rationale and reviewer hypothesis are distinct relation types. A reviewer hypothesis is visibly interpretation and never becomes a factual edge merely through approval of the surrounding nodes. “Association” requires a study that actually tests the relationship. Separate an asserted tradeoff from a measured one; an attractive material story is not evidence of patient benefit.

**Documentary feasibility:** the original SAPIEN 3 SSED describes the external PET skirt and its stated sealing purpose on printed page 2; page 10/Table 6 describes hydrodynamic testing [P1]. These are useful adjacent records, but their coexistence does not establish that the skirt caused a clinical outcome. Keep this a historical model 9600TFX example rather than current-family labeling.

A particularly valuable counterexample is the August 28, 2025 Evolut supplement: printed page 6 explicitly explains application of mixed-generation registry evidence to later iterations, including FX+, which was absent from that dataset [P2]. Preserve both the actual cohort composition and the regulator's stated bridge. Do not rename the cohort as FX+ evidence, and do not reject a documented bridge simply because generations differ. Table 1 also distinguishes tests reported as passing from characterization-only tests; those categories should not be flattened into one strength score.

**Unusual sources:** SSED nonclinical tables, supplement summaries, exact IFUs, written FDA/sponsor advisory briefing documents, and primary methods papers. NIH award abstracts can identify funded questions for follow-up, but establish research aims, not successful experiments [P8–P9]. Patents require the repository's explicit product-to-patent link before device attachment.

**Increment:** add authored analytical-question records and typed evidence links to existing claims/observations/cohorts; attach scope, source locator, inference status, counterevidence, missing links and “what would change this reading.” Reuse existing observations rather than copy values. Show an inspectable card in Data, linked from Atlas and News Insights, with a concise evidence/gap export. This is additional authored analysis, not a claim that a UI graph proves causation.

| Perspective | Strongest criticism | Required response |
| --- | --- | --- |
| Engineer | Without alloy condition, geometry and processed-state tests, this cannot support design qualification | Expose those unknowns; offer a research argument and test inventory, with no simulation-ready export |
| Clinician | Bench performance may not translate, and between-study outcomes confound design with selection and technique | Keep lanes separate; show population/endpoint applicability; no device winner or inferred causal chain |
| Executive | Every question may become an expensive bespoke literature review | Limit the pilot to two questions; reuse evidence objects and measure specialist maintenance effort |

**Pilot and acceptance:** two already represented families, one answerable question each. An engineer and clinician check every displayed bridge. Include at least one absent bridge and the documented generation-bridging case. In five observed user sessions, at least four users should locate the relevant evidence boundary without prompting; compare task time with the current app. These are proposed acceptance thresholds, not study results. Stop if public data cannot answer either question beyond restating the spec sheet.

## 2. Living evidence and obligation tracking

**Reader question:** “Since I last reviewed this conclusion, what changed, and why should I reconsider it?”

The core object is a **reviewed consequence record**:

`old and new source passages → affected claim/question/comparison → disposition → reader-visible consequence`

Possible dispositions include no substantive consequence, scope changed, interpretation needs review, contradicted, and unresolved. A changed PDF hash is only a review trigger. A PMA supplement is not automatically a new marketed generation. Registry date changes are not automatically operational delays or evidence of failure. Preserve valid/effective time separately from publication, registry submission/posting, retrieval and review time; unknown dates stay unknown.

Add an **evidence-obligation ledger** linking an approval/indication to required follow-up questions, study identity, prescribed endpoints/follow-up, official status and reported results. The FDA PAS database exposes study and reporting status and interim/final summaries [P3]. The original WATCHMAN approval letter, March 13, 2015, printed pages 3–5, demonstrates how different post-approval studies and reporting requirements can coexist [P4]. It is evidence of historical requirements, not proof that any requirement is currently outstanding, late or unsatisfied. Later revisions and official statuses must be reconciled before a current conclusion.

ClinicalTrials.gov already offers record history [P7]. The product value is therefore not another field diff. It is the reviewed connection between an endpoint/enrollment/version/label change and a specific VISUALIZE-SH conclusion. Show “this conclusion needs reconsideration” only after reviewer disposition. Present a bounded “since your selected date” view, with snapshots and source dates, rather than creating a new notification system in the first release.

**Increment:** reuse `scripts/intelligence/snapshot.ts`, document snapshots and `review:prepare`; add source-revision relationships, analytical dependencies, reviewer dispositions and obligation observations. Store a claim's prior state and disposition without silently overwriting approved evidence. Add a status panel to the analytical card and a filtered change view. News Insights can link to meaningful reviewed consequences instead of re-summarizing all edits.

| Perspective | Strongest criticism | Required response |
| --- | --- | --- |
| Engineer | Text replacement may be formatting or manufacturing administration rather than design | Classify only supported changes; retain exact passages and “scope unresolved” |
| Clinician | A protocol edit has different meaning before enrollment versus after analysis | Keep timing and cohort context; avoid insinuations of selective reporting without evidence |
| Executive | Alert fatigue and review cost could exceed value | Prioritize changes affecting curated questions; batch low-impact edits; measure useful dispositions per review hour |

**Pilot and acceptance:** reuse two families from #1, replay a small preselected set of substantive and non-substantive revisions, and reconcile at least one historical obligation against a current official record. All impacted objects must be resolvable and every public consequence reviewer-disposed. No unreviewed legal “overdue/noncompliant” label. Measure precision, missed consequential changes and reviewer minutes; freeze scope if noise dominates.

This should extend [WOR-13](https://linear.app/workspace-visualize-sh/issue/WOR-13/maintain-citation-identity-and-a-bounded-source-change-review-queue), not create a competing alert pipeline. Resolve current-label and cohort prerequisites through WOR-9/WOR-11 where applicable. It is the second priority because #1's arguments will otherwise become stale.

## 3. Approval-to-practice analysis

**Reader question:** “What additional evidence, coverage and program requirements sit between this device's authorization and routine use?”

Begin with three explicitly different records: **FDA label**, **payer coverage/operational policy**, and, later, **observed billed services**. Approval, coverage, professional reimbursement, hospital economics and realized access each answer a different question. An empty policy cell does not mean noncoverage.

**Documentary feasibility:** CMS NCD 20.34, section B, sets LAAC conditions involving independent shared decision making, program/operator requirements and registry participation [P5]. These are useful implementation facts absent from a materials/specification table. The initial card should place the dated policy beside an exact current label, attribute each condition, and explain mismatches only after checking both documents. This research did not perform a full contemporary FDA-label-versus-policy eligibility audit.

Start with TAVR and LAAC policy cards and their evidence-development questions. A program lead could identify which requirements need local confirmation; an engineer could see operational context; an executive could distinguish clinical evidence maturity from a regulatory milestone. These are intended uses to test, not proven adoption benefits or billing advice.

**Conditional utilization extension:** use CMS's Geography and Service aggregates rather than rebuilding state totals by summing suppressed provider rows. The March 2025 methodology describes aggregates based on the broader underlying claims [P10]. Label service year, release vintage, provider geography, code and place of service. A current catalog entry documents public annual availability through 2024, but no code-specific volumes were extracted in this task [P11].

The hard limits are material: Part B FFS is a subset of practice; professional services are not necessarily unique implants; provider location is not patient residence; code changes/modifiers and co-operators can defeat naive counts; these files do not identify implant brands. Payment components are not acquisition prices or full procedure margins. Suppressed/missing values must not become zero. For a geographic rate, first establish a compatible population denominator and coding definition; otherwise display counts with scope. Low billed utilization alone does not establish unmet need or an access barrier.

**Increment:** proposed coverage-policy records need jurisdiction, payer, service/indication scope, policy version, effective and implementation dates, operational conditions and locators. Keep them distinct from FDA decisions/indications. Any later utilization series also needs a versioned code crosswalk, service definition, geography basis, vintage, suppression and aggregation method. Review code-description redistribution rights before public export. The existing static build can serve small reviewed aggregates; there is no need to ship raw claims-sized files.

| Perspective | Strongest criticism | Required response |
| --- | --- | --- |
| Engineer | Broad procedure statistics lose exact-device identity | Keep policy/procedure analysis at its supported level; do not attach brand or version conclusions |
| Clinician | Coverage, suitability and access can be mistaken for one another | Attribute policy conditions; avoid patient-specific recommendations and provider quality rankings |
| Executive | A map may look like a market-opportunity estimate it cannot support | Launch policy cards first; require an independently reviewed methods note before utilization or opportunity language |

**Pilot and acceptance:** two procedure cards with dated source comparisons and explicit unknowns, reviewed by a clinician/program lead and a reimbursement specialist. Users must correctly distinguish label, coverage and payment. Only proceed to utilization if a coding reviewer can define stable, non-overlapping service measures and explain all aggregation limits. If the card does not improve a concrete program-planning question, stop. No all-payor extrapolation or brand market share.

## Source acquisition and maintenance priorities

These are source categories for bounded pilots, not a claim of complete ingestion or unrestricted reuse.

| Source | Useful new analysis | Access / operational reality | Main limit |
| --- | --- | --- | --- |
| SSED/IFU and supplement documents [P1–P2] | Design rationale, test disclosure, cohort bridging | Public PDFs; manual section extraction and identity reconciliation | Historical scope; pass summaries may omit numeric results; no inference of full test dossier |
| FDA PAS records and approval letters [P3–P4] | Required questions versus reported follow-up | Public database/documents; current status needs dated observation | Full protocols/reports may require a manufacturer request or FOIA; missing public results is not noncompliance |
| ClinicalTrials.gov history/protocol/results [P7] | Changes in prespecification, cohort and reporting | Public history UI; current API snapshot support already exists locally | Current snapshots do not reconstruct all earlier revisions; sponsor entries need reconciliation |
| CMS coverage decisions/CED [P5, P12] | Operational conditions and evidence questions | Public dated policies; specialist interpretation | Payer/jurisdiction/time scope; coverage is not label or individual eligibility |
| CMS geography/service and documented methods [P10–P11] | Billed-service context | Public annual aggregates; dated dictionary and code review required | Limited population, geography and unit of observation; no brand attribution |
| Written advisory briefing materials [P8] | Regulator/sponsor questions and uncertainty | Public releasable written packages where available | Distinguish sponsor assertions from regulator analysis and final decisions; exclude oral testimony/transcripts |
| NIH RePORTER awards [P9] | Which engineering questions receive funding | Public API for award information; optional discovery expansion | Award aims and budgets do not establish outcomes, IP, or commercial readiness |
| AccessGUDID [P13] | Identifier/model reconciliation across sources | Public search, downloads and APIs | Identification aid; it does not establish clinical performance, product equivalence or a complete generational history |
| MAUDE [P6] | Reported problem vocabulary for documentary follow-up | Public reports, subject to reporting and identity issues | No comparative adverse-event rates or causal inference; defer bulk narrative ingestion |

NIH awards, patent signals, manufacturing inspections, public procurement and European summaries may become useful secondary discovery streams. They are not first-pilot dependencies: an award is not a result, an assignee is not a product link, an inspection is not a device failure rate, a tender is not total sales, and regional records require separate identity/coverage validation. No new factual assertions should be imported from those streams without the source policy's documentary checks.

## Practical sequence and gates

1. **Create two reviewed analytical cards for #1**, using current sources and the existing evidence model. Human review is the critical resource. Agree on one engineer and one clinician reviewer before expanding extraction.
2. **Attach a small consequence/obligation prototype for #2** to those cards. Test historical replay, irrelevant changes and ambiguous generations; maintain it through WOR-13.
3. **Test two policy/operational cards for #3** with clinical-program users. Require evidence of usefulness before code extraction or geographic visualization.

For each pilot, budget a fixed number of questions and reviewer hours, then measure actual extraction and refresh effort. Do not present unmeasured delivery estimates as forecasts. A reasonable experiment is four weekly bounded source checks; it creates no automation. Record useful answers, substantive corrections, unresolved joins, reviewer minutes and repeat use. Compare task completion with the current app and direct official-source browsing. Downloads/page views alone do not establish utility.

Future implementation would update authored YAML, schemas, semantic validators and TypeScript together, then regenerate static payloads. Potential integration surfaces are `src/types/intelligence.ts`, `scripts/intelligence/validation.ts`, the Data/Atlas components and the existing snapshot/review packet scripts. Exact file design remains open; no speculative fields were added here.

New factual records and synthesis stay draft pending the relevant curator/author review. Keep source snapshots and licensed material outside Git. Publish concise original summaries, permitted metadata and links; public accessibility does not establish figure, code-description or bulk redistribution rights. Existing source-policy work in WOR-6 and current factual-review work in WOR-10 remain prerequisites for promoting affected content, not completed outcomes of this strategy research.

### Research validation and remaining limits

The current implementation and payload counts were inspected directly. The coordinator checked the material FDA/CMS examples against the actual documents; the Sol agent reviewed the integrated memo and reported no blocking findings. Local Markdown links and reference definitions were checked, and the documentation whitespace check passed. This was documentation-only research, so application builds were not required. Commercial claims remain vendor-advertised, user demand remains untested, and no code-specific utilization, full current-label audit or proprietary database benchmark was performed.

## Source register

All sources below: access **public**; retrieved **2026-10-15**. Register dates describe the document, not a site's copyright year. Vendor sources support advertised capabilities only. FDA/CMS primary documents support only their specified historical or policy scope. No full text, source figures, subscription exports or raw evidence are copied into the repository.

| ID | Document / publisher | Publication date | Exact locator and scope |
| --- | --- | --- | --- |
| C1 | [Medtech 360 — Clarivate][C1] | Undated | Features; Benefits; Additional benefits of Data Explorer. Public browser page inspected after web retrieval returned 403. No subscription contents tested. |
| C2 | [Medical Devices — GlobalData][C2] | Undated | Industry intelligence: Vast therapy coverage, Analyzer tools, Predictive signals. Public browser page inspected after web retrieval returned 403. No completeness/forecast validation. |
| C3 | [Meddevicetracker homepage][C3]; [official FAQ][C3a] | Homepage undated; FAQ 2024-07 | Report Library, Events, Catalysts; FAQ p. 2, Advanced Product Search / Ask the Analyst. Homepage branding differs from dated FAQ. |
| C4 | [Medical Devices — Definitive Healthcare][C4] | Undated | Commercial strategy; Market access and reimbursement; Atlas All-Payor Claims. Vendor scope claims, not inspected claims data. |
| C5 | [Granta MI Enterprise — Ansys][C5] | Undated | Capabilities: Test Data Management; CAD/CAE/PLM; Comprehensive Materials Data. Enterprise/module scope, not every Granta product. |
| C6 | [Other Search Tools — Total Materia][C6] | Undated | Horizon; introductory cross-reference note; Extended Range → Stress-Strain → Material Condition. |
| C7 | [Evaluate Technology — ECRI][C7] | Undated | How ECRI Evaluates Technology → Technology Evaluation / Clinical Evidence. No subscriber evaluations inspected. |
| C8 | [Device Events homepage][C8] | Undated | The MAUDE Solution; Key Features; Software Features. Report search/normalization, not validated risk prediction. |
| C9 | [Rimsys homepage][C9] | Undated | Two Products, One Layer of Intelligence; capabilities/change management; Request Beta Access. Availability qualification retained. |
| C10 | [Greenlight Guru platform][C10] | Undated | AI-powered global search; FAQs on single source of truth and cross-module traceability. Customer QMS context. |
| P1 | [SAPIEN 3 SSED P140031 — FDA][P1] | Approval 2015-06-17 | Printed pp. 1–2, exact model/description; p. 10, Table 6, hydrodynamic testing. Historical model 9600TFX; no current-family inference. |
| P2 | [Evolut SSED P130021/S174 — FDA][P2] | Approval 2025-08-28 | Printed p. 6, Table 1 and section X including explicit clinical-data generation applicability note. Redo-TAVR scope; actual cohort distinct from regulatory applicability. |
| P3 | [Post-Approval Studies Program — FDA][P3] | Undated | Post-Approval Studies Database; Updates to Study Information; Obtaining protocols/final reports. Database capability, not a current study-status extraction. |
| P4 | [WATCHMAN approval letter P130013 — FDA][P4] | 2015-03-13 | Printed pp. 3–5, separate PAS requirements and reporting. Historical original device; no current outstanding-status claim. |
| P5 | [NCD 20.34 LAAC — CMS][P5] | Effective 2016-02-08; implementation 2016-10-03 | Tracking Information; B. Nationally Covered Indications, operator/program/registry/shared-decision requirements. Dated Medicare policy; not all payers. |
| P6 | [About MAUDE — FDA][P6] | Undated | Limitations of Medical Device Reports. Reporting data cannot establish comparative rates, incidence or causation. |
| P7 | [Modernized ClinicalTrials.gov — NCBI/NLM][P7] | 2023-06-06 | Highlights of the Modernized Website, Record History paragraph. Official history feature description; no complete trial-history dataset extracted. |
| P8 | [Public availability of advisory materials — FDA][P8] | 2008-08 | Guidance title and description. Written briefing source category; no meeting outcome or testimony used. |
| P9 | [NIH RePORTER Projects APIs — NIH][P9] | Undated | Description of scientific awards API. Discovery capability; no awarded project or experimental outcome extracted. |
| P10 | [Physician/practitioner methodology — CMS][P10] | 2025-03 | Printed pp. 3–6, Population; Summary Tables; Data Limitations. Dated methodology must be rechecked against any later release used for implementation. |
| P11 | [Geography and Service dataset catalog — HHS/CMS][P11] | Undated catalog | Description; Complete Metadata; temporal coverage; annual cadence. Catalog checked for availability; no procedure count extracted. |
| P12 | [NCD 20.32 TAVR — CMS][P12] | Effective 2019-06-21; implementation 2020-06-12 | Tracking Information; Nationally Covered Indications. Candidate pilot policy, not a complete contemporary code/coverage audit. |
| P13 | [AccessGUDID — NLM/FDA][P13] | Undated | About AccessGUDID; Download; API. Device identification scope. |

[C1]: https://clarivate.com/life-sciences-healthcare/medtech/strategic-portfolio-planning/medtech360/
[C2]: https://www.globaldata.com/industries/medical-devices/
[C3]: https://www.meddevicetracker.com/
[C3a]: https://www.meddevicetracker.com/PDFs/Meddevicetracker_FAQs.pdf
[C4]: https://www.definitivehc.com/industry/medical-devices
[C5]: https://ansys.synopsys.com/products/materials/granta-mi
[C6]: https://docs.totalmateria.com/search-tools/other-search-tools
[C7]: https://home.ecri.org/pages/evaluate-technology
[C8]: https://deviceevents.com/
[C9]: https://www.rimsys.io/
[C10]: https://www.greenlight.guru/platform
[P1]: https://www.accessdata.fda.gov/cdrh_docs/pdf14/P140031B.pdf
[P2]: https://www.accessdata.fda.gov/cdrh_docs/pdf13/P130021S174B.pdf
[P3]: https://www.fda.gov/medical-devices/postmarket-requirements-devices/post-approval-studies-program
[P4]: https://www.accessdata.fda.gov/cdrh_docs/pdf13/P130013A.pdf
[P5]: https://www.cms.gov/medicare-coverage-database/view/ncd.aspx?NCDId=367
[P6]: https://www.fda.gov/medical-devices/mandatory-reporting-requirements-manufacturers-importers-and-device-user-facilities/about-manufacturer-and-user-facility-device-experience-maude-database
[P7]: https://ncbiinsights.ncbi.nlm.nih.gov/2023/06/06/modernized-clinicaltrials-gov-website/
[P8]: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/preparation-and-public-availability-information-given-advisory-committee-members
[P9]: https://data.nih.gov/data-sources/nih-reporter-projects-apis
[P10]: https://data.cms.gov/sites/default/files/2025-04/MUP_PHY_RY25_202350312_Methodology_508.pdf
[P11]: https://catalog.data.gov/dataset/medicare-physician-other-practitioners-by-geography-and-service-bc0c0
[P12]: https://www.cms.gov/medicare-coverage-database/view/ncd.aspx?NCDId=355
[P13]: https://accessgudid.nlm.nih.gov/
