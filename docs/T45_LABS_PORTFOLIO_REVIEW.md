# T45 Labs portfolio review — local draft

Reviewed 2026-10-06 for [WOR-25](https://linear.app/workspace-visualize-sh/issue/WOR-25/evaluate-t45-labs-portfolio-and-populate-supported-atlasdata-drafts).
Branch: `codex/wor-25-t45-portfolio`. Factual promotion and push to origin await
the owner's review. Existing uncommitted owner work was preserved.

## Recommendation and implemented scope

| Company / offering | Recommendation | Local result |
| --- | --- | --- |
| Mitria Medical / Subvalvular Spacer (SVS) | Add: distinct investigational repair concept for secondary/functional MR, directly within structural heart. | New company, therapy, family/design profile, eight source-located Data fields, three family-level references and a sponsor-attributed US expanded-access milestone. |
| VahatiCor / A-FLUX Reducer System | Retain existing identity; improve its evidence and current study status. | Existing family/version reused; European study refreshed, separate US study added, two dated registry snapshots and source records added. |
| Advanced NanoTherapies / SirPlux Duo | Hold from this catalog: coronary/peripheral drug-coated balloon would expand the existing structural-heart condition/class coverage. | Evaluated and documented here; no therapy, condition or Data category added. |
| NuevoSono / IVUS platform | Hold from this catalog: intravascular diagnostic imaging, without a documented structural-heart-specific use in the inspected materials. | Evaluated and documented here; no therapy or Data category added. |

This is a catalog-fit judgment, not a clinical ranking. The [T45 portfolio](https://t45labs.com/)
and [September 29 partnership release](https://www.prnewswire.com/news-releases/mitria-medical-partners-with-t45-labs-to-advance-novel-mitral-valve-repair-therapy-302889421.html)
identify these four companies. Each remains subject to its specific evidence limits.

## Mitria additions and boundaries

IDs: `co-mitria-medical`, `dev-mitria-svs`, `family-mitria-svs`, `ver-mitria-svs`.
Category: `mitral-subvalvular-repair`, separate from TEER, chordal reconstruction
and annuloplasty. The version record represents the contemporary disclosed design;
its name and summary explicitly preserve the absence of an exact model/generation.

The new Data fields describe the nitinol braid, intended posterior leaflet support,
transcatheter development approach, intended functional MR population and
investigational status. Implant sizes, delivery profile and pivotal trial identity
are explicit disclosure gaps. No FDA approval decision, detailed vascular route,
quantitative efficacy claim or available commercial configuration was added.

`event-mitria-svs-first-us-expanded-access` distinguishes the sponsor-reported
January 2026 procedure month from the March 5 announcement date. The exact build
and regulatory case authorization remain unverified. Single-patient expanded
access is not recorded as commercial authorization.

The original written AATS abstract describes two **surgical** patients with
different follow-up and concomitant CABG in one case. It is linked at family level,
with no exact-version numerical outcomes. The 2024 institutional account and
2025 abstract have different follow-up summaries; those summaries are not merged.
The September release's cumulative sponsor count is not an analyzed cohort and
was not entered as an outcome.

## A-FLUX corrections

Existing IDs retained: `co-vahaticor`, `dev-aflux`, `family-aflux`, `ver-aflux`,
`trial-serra-i`. New graph trial: `trial-serra-i-us`.

| Official record | Protocol / location scope | Last update posted | Status inspected 2026-10-06 | Enrollment basis |
| --- | --- | --- | --- | --- |
| [NCT06991322](https://clinicaltrials.gov/study/NCT06991322) | VHC-00002; listed European centers | 2026-08-26 | Active, not recruiting | Estimated 30 |
| [NCT07449325](https://clinicaltrials.gov/study/NCT07449325) | VHC-00004; acronym SERRA-I US, listed US centers | 2026-09-25 | Suspended to implement a protocol change | Estimated 30 |

These are separate registry identities, not a duplicated/re-registered record.
The counts are targets and are not combined or called treated/enrolled totals.
Neither record posts results. US actual registry start is 2026-04-07; this differs
from the [June 17 sponsor announcement](https://vahaticor.com/vahaticor-enrolls-first-u-s-patient-in-serra-i-clinical-study-of-a-flux-reducer-system-for-cmd/)
of first US enrollment. The suspension's stated reason does not establish an
adverse-event cause or device discontinuation.

Added intelligence trials `evidence-trial-serra-i-eu` and
`evidence-trial-serra-i-us`, with snapshots `snapshot-serra-i-eu-20261006` and
`snapshot-serra-i-us-20261006`. Both use family-level mapping because the registry
does not specify an exact model revision. The Data status claim carries both
registry sources. The old placement of SERRA-I in a "Pivotal trial" cell was
replaced by explicit missingness: early feasibility is not pivotal approval evidence.

## Documentary provenance

All sources below are public and were retrieved on 2026-10-06. Sources without
a publication date remain undated; registry publication dates in source records
are first-posted dates, while snapshots preserve last-update dates separately.
Only concise summaries, bibliographic metadata and links enter public outputs.
Raw registry JSON stays under ignored `artifacts/t45-review/`.

| Source / date | Exact locator and permitted scope | Limit |
| --- | --- | --- |
| [T45 Mitria page](https://t45labs.com/mitria-medical/), undated | "Repairing Functional MR From Beneath the Valve," paragraphs 1–2; nitinol braid, intended mechanism, January 2026 first US case | Portfolio/sponsor account; exact model and procedure details absent. |
| [T45 partnership release](https://www.prnewswire.com/news-releases/mitria-medical-partners-with-t45-labs-to-advance-novel-mitral-valve-repair-therapy-302889421.html), 2026-09-29 | Opening paragraphs; "About Mitria Medical," paragraph 1; preceding investigational-device statement | Sponsor design/identity/status disclosure. No quoted statements used as evidence. |
| [Mitria US release](https://www.prnewswire.com/news-releases/mitria-medical-announces-first-use-of-novel-mitral-valve-repair-device-in-us-under-single-patient-expanded-access-302704666.html), 2026-03-05 | Opening non-quotation paragraphs; "About Mitria Medical"; paragraph beginning "In 2019" | Sponsor reports expanded access; no procedure date or verified marketing decision. |
| [AATS MC83 written abstract](https://www.aats.org/resources/sub-valvular-spacer-implant-fo-11413), 2025-12-12 | Written Abstract, Methods/Results, patient 1 and patient 2 | Preliminary surgical cases; build unresolved and CABG confounding. No recording used. |
| [Cleveland Clinic design article](https://consultqd.clevelandclinic.org/transforming-cardiovascular-care-three-of-the-latest-innovations), 2024-07-11 | "Subvalvular Spacer" section, paragraphs 1–3 | Historical design and surgical experience; no generation bridge. |
| [SERRA-I European API](https://clinicaltrials.gov/api/v2/studies/NCT06991322), first posted 2025-05-27 | `protocolSection.identificationModule`, `statusModule`, `designModule.enrollmentInfo`, `armsInterventionsModule`, `outcomesModule`, `contactsLocationsModule`; `hasResults` | Mutable registry snapshot; last update 2026-08-26. |
| [SERRA-I US API](https://clinicaltrials.gov/api/v2/studies/NCT07449325), first posted 2026-03-04 | Same JSON modules, including `statusModule.whyStopped` and `startDateStruct` | Mutable registry snapshot; last update 2026-09-25. |
| [ANT product page](https://advancednanotherapies.com/), undated | "Two Drugs Working Together," "Better Outcomes, Safer Treatments," development disclaimer | Sponsor describes sirolimus/paclitaxel coronary/peripheral DCB. No clinical efficacy or designation assertion imported. |
| [NuevoSono page](https://nuevosono.com/), undated | Opening/technology sections; future AI-feature disclaimer; "About NuevoSono" and device disclaimer | IVUS development platform; future AI functions are pending validation/clearance, not available validated clinical capabilities. |

Discovery lead held out: [2022 ex vivo SVS paper, PMID 37273469](https://pubmed.ncbi.nlm.nih.gov/37273469/),
DOI `10.1016/j.shj.2022.100023`. Citation identity was inspected, but full text could
not be inspected through the accessed PMC/publisher pages; no experimental
numbers/specifications were extracted. Direct Mitria homepage access also failed;
the verified portfolio link establishes the website URL, not its unseen contents.

No device images were added: manufacturer/abstract images have no verified
redistribution basis in this review. Open source-policy enforcement/rights work
remains tracked by [WOR-6](https://linear.app/workspace-visualize-sh/issue/WOR-6/enforce-source-eligibility-and-reuse-provenance-in-the-evidence).

## Validation and approval scope

Authored files: `data/companies.yaml`, `data/therapies.yaml`, `data/trials.yaml`,
`data/intelligence/pilot.yaml`, `data/intelligence/taxonomy.yaml`,
`data/intelligence/catalog/hf-devices.yaml`, and the new
`data/intelligence/catalog/mitral-subvalvular.yaml`. Payloads regenerated from YAML:
`public/graph.json` and `public/intelligence.json`. No schema or application-code
change was needed; the new category uses existing fields and attributes.

- `npm run validate:local`: passed, including 102 tests, both TypeScript checks,
  schema/semantic validation, repository content scan and no-send newsletter preflight.
- `VITE_BASE=/ npm run build`: passed.
- `git diff --check`: passed.
- Focused compiled-data projection: Mitria appears under the new Data category;
  A-FLUX carries both current registry statuses; new trials preserve family mapping
  and estimated enrollment; all authored evidence additions remain draft.

Approval covers the additions/corrections described here and a push of this task's
changes to origin. It does not cover unrelated owner work, promotion of other
draft evidence, merging, newsletter publication or delivery. All factual records
currently remain draft; approval to push alone will preserve their draft state.
