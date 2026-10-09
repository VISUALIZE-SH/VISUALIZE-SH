# Laplace Interventional draft inclusion — October 9, 2026

Tracked in [WOR-28](https://linear.app/workspace-visualize-sh/issue/WOR-28/add-documentary-sourced-draft-laplace-interventional-company-and-ttvr),
project `P-WOR-1` / `visualize-sh-webapp`. Factual promotion remains part of
[WOR-10](https://linear.app/workspace-visualize-sh/issue/WOR-10/complete-curator-review-of-draft-catalog-claims-and-held-news).
This is local draft curation, not publication approval.

## Existing coverage and additions

The database previously had only
`news-2026-07-02-laplace-receives-fda-ide-approval-for-triumph-pivotal-ttvr-trial`,
linked to `cond-tr`. Searches of authored company, therapy, trial and intelligence
data found no dedicated Laplace identity. Existing IDs are preserved.

| Layer | Added or updated IDs | Authored location |
| --- | --- | --- |
| Company | `co-laplace-interventional` | `data/companies.yaml` |
| Therapy | `dev-laplace-ttvr` | `data/therapies.yaml` |
| Trials | `trial-laplace-efs-us`, `trial-laplace-efs-canada`, `trial-laplace-triumph` | `data/trials.yaml` |
| Atlas/Data identity | `family-laplace-ttvr`, `ver-laplace-ttvr-investigational` | `data/intelligence/catalog/laplace-ttvr.yaml` |
| Trial identity | `evidence-laplace-efs-us`, `evidence-laplace-efs-canada`, `evidence-laplace-triumph` | `data/intelligence/pilot.yaml` |
| Dated registry observations | `snapshot-laplace-efs-us-20261009`, `snapshot-laplace-efs-canada-20261009`, `snapshot-laplace-triumph-20261009` | `data/intelligence/pilot.yaml` |
| References | `bib-laplace-company`, `bib-laplace-ttvr`, seven documentary source records | `data/intelligence/catalog/laplace-ttvr.yaml` |
| Existing news | Same July 2 ID; source corroboration, company/device/trial links and draft review state | `data/news.yaml` |

All new graph records have `curation.status: draft`; all new intelligence
evidence records have `reviewStatus: draft`. Families and sources do not support
a review-status field. The existing news story is held in draft after updating
its factual framing; it is omitted from compiled public news until review.
Its July 2 reporting date is preserved separately from the company's June 29
announcement. The graph and intelligence payloads are regenerated from YAML.

## Documentary sources and exact scope

All sources below were publicly accessible and inspected on **2026-10-09**.
No licensed full text or source images were copied to public assets. Public
access is the access basis, not a license to redistribute documents or figures.
Only concise original summaries, metadata and links are added.

| Source | Publication date | Locator and permitted factual scope |
| --- | --- | --- |
| [Company homepage](https://laplaceint.com/) | Not stated | About Us: company identity, Plymouth/Minnesota location and percutaneous TTVR development. Do not adopt predicted survival or quality-of-life benefit as a clinical result. |
| [Management team](https://laplaceint.com/team) | Not stated | Management Team, Ramji Iyer card: founder and chief executive officer. No career-history or founding-year inference. |
| [Technology overview](https://laplaceint.com/technology-1) | Not stated | Laplace TTVR System heading, SIMPLE paragraph: manufacturer-described access routes; final Caution: investigational use and no sale. Embedded procedure video was not used as evidence. |
| [Company-authored TRIUMPH announcement](https://www.prnewswire.com/news-releases/laplace-announces-fda-ide-approval-of-triumph-pivotal-trial-of-its-transcatheter-tricuspid-valve-replacement-system-302813749.html) | 2026-06-29 | Opening paragraphs: sponsor-reported IDE event and proposed study cohorts; About the Company: privately held status. No quoted clinical opinion or quantitative outcome extracted. |
| [US EFS registry, NCT06183684](https://clinicaltrials.gov/study/NCT06183684) | First posted 2023-12-27; latest revision posted 2026-09-25 | Official API `protocolSection.identificationModule` (CLN-002), sponsor, description, design, arms, eligibility inclusion 5, outcomes and status; top-level `hasResults`. |
| [Canadian EFS registry, NCT07171060](https://clinicaltrials.gov/study/NCT07171060) | First posted 2025-09-12; latest revision posted 2026-07-22 | Same API modules; CLN-003 and Canadian identity are retained separately; eligibility inclusion 5 specifies transjugular access. |
| [TRIUMPH registry, NCT07687485](https://clinicaltrials.gov/study/NCT07687485) | First posted 2026-07-07; latest revision posted 2026-07-22 | Same API modules; CLN-004, acronym, EVOQUE comparator, cohort design, protocol endpoints and registry enrollment discrepancy. |

Registry pages require JavaScript in the text browser, so the actual records were
read through the [official ClinicalTrials.gov API sponsor query](https://clinicaltrials.gov/api/v2/studies?query.spons=Laplace&pageSize=100&format=json).
The complete three-record response is retained only in ignored local
`artifacts/research/laplace-2026-10-09/clinicaltrials-sponsor-query.json`.
Intelligence source `publishedAt` represents first posting; `registryUpdatedAt`
represents the inspected revision; `observedAt`/`retrievedAt` represent this review.

The [LSI spotlight](https://www.lifesciencemarketresearch.com/insights/lsi-alumni-innovator-spotlight-laplace-interventionals-ramji-iyer)
is based on an interview/conversation with Iyer and is a discovery lead only
under the documentary-source policy used for this review. It is not included as a
factual source. The original [July 2 Cardiac Interventions Today report](https://citoday.com/news/ide-for-triumph-pivotal-trial-of-laplaces-ttvr-system)
is retained as secondary context in the existing news item, corroborated by the
original corporate document and registry. Its interview-derived clinical opinion
is not used.

## Registry observations and unresolved details

| Study | Status in inspected revision | Enrollment basis | Start-date basis |
| --- | --- | --- | --- |
| US EFS | RECRUITING; verified September 2026 | 65 estimated total | 2024-02-19 actual |
| Canadian EFS | RECRUITING; verified July 2026 | 15 estimated total | 2024-06-18 actual |
| TRIUMPH | NOT_YET_RECRUITING; verified July 2026 | API total: 700 estimated; narrative: 400 randomized plus up to 150 single-arm | September 2026 estimated; no actual start inferred |

The TRIUMPH discrepancy is inside the registry itself:
`protocolSection.designModule.enrollmentInfo.count` is 700, while
`designInfo.interventionModelDescription` gives 400 randomized and up to 150
single-arm patients. The company announcement supports the narrative cohort
plan but does not explain 700. The raw estimate is retained with a caveat in the
dated intelligence snapshot; coarse graph `enrollment` is omitted. Do not replace
700 with 550, infer unmentioned participants, or treat any estimate as an outcome
denominator.

The graph status enum lacks NOT_YET_RECRUITING. TRIUMPH uses `status: unknown`
with the exact dated registry status in notes; the intelligence snapshot retains
NOT_YET_RECRUITING. A passed estimated start month does not establish recruitment.
No results are posted in any of the three inspected registry records; this does
not exclude external publications.

Exact product/model generations, implanted material composition, size ranges,
route-specific build equivalence and TRIUMPH access route are uncurated. The
Atlas/Data version is explicitly an investigational overview; all three trials
use `versionMapping: unclear`, empty `versionIds` and family-level mappings.
TRIUMPH includes both Laplace and EVOQUE family/graph edges as study interventions,
not as a claim of shared generations or demonstrated noninferiority. No outcomes,
readouts, exact-size observations, patent links or figure assets are added.

The device's empty `materials` list records a curation gap. The manufacturer's
26 Fr description is not entered as a measured delivery dimension without an
exact configuration and definition. Only qualitative manufacturer-described
access routes enter the draft spec table.

The June 29 announcement is a sponsor-reported IDE event. The limited public FDA
search did not yield a decision-specific Laplace/TRIUMPH document; no regulator
decision, approved indication or marketing-authorization timeline is created.
Curator review must resolve these limits before promoting stronger claims.

The public [FDA IDE explanation](https://www.fda.gov/medical-devices/premarket-submissions-selecting-and-preparing-correct-submission/investigational-device-exemption-ide),
retrieved 2026-10-09 (publication date not stated), supports the distinction used
in the news summary: the opening paragraph and paragraph beginning “An approved
IDE permits” describe clinical investigation rather than commercial distribution.
Source class is general regulatory guidance, with public access; it does not
confirm an authorization for Laplace and is not entered as a product decision.

## Validation and handoff

Checks completed:

- `npm run validate:local`: passed, including both data builds, both TypeScript
  checks, all **102 tests**, repository security scan and offline newsletter
  preflight. Optional newsletter account/domain configuration remains outside
  this task's scope.
- `VITE_BASE=/ npm run build`: passed; graph and intelligence payloads were
  regenerated from authored YAML.
- Targeted integration assertions: five new draft graph entities, a searchable
  tricuspid Data entry, three family-scoped trials and dated snapshots; no inferred
  marketing authorization, clinical outcomes or exact-size configuration.
  Updated news remains excluded from compiled public news pending review.
- Owner-baseline comparison: all pre-existing company/device/trial records and
  all pre-existing pilot evidence records/collections are semantically unchanged.
  The only existing news record edited is the Laplace item; pilot `updatedAt`
  advances to this review date.
- `git diff --check`: passed. Links and exact documentary locators reviewed.

Validation logs and raw registry response remain in ignored local research
artifacts. Curator signoff is outstanding for all additions, the held news item,
the registry discrepancy and generation/material gaps. No commit, publication
or delivery is part of this draft-inclusion task.
