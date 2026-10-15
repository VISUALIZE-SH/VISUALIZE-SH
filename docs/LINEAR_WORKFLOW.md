# Linear development workflow

Linear is the execution backlog. Repository docs describe behavior and evidence;
they are not a second live task tracker. Initial organization was seeded on
2026-10-04 from the current handoff, October database audit, reference audit,
newsletter rollout notes, and two existing specialty preview subjects.

## Workspace and project routing

Team: `Workspace-visualize-sh` (`WOR`), UUID
`166dcf1c-8f50-436f-ac57-065c75821af4`.

| Project | ID | File work here |
| --- | --- | --- |
| [visualize-sh-webapp](https://linear.app/workspace-visualize-sh/project/visualize-sh-webapp-0301c63597f8) | `P-WOR-1` | News/Atlas/Data and graph UI, schemas, validation, catalogs, citations, factual research/curation, source infrastructure. |
| [visualize-sh-newsletter](https://linear.app/workspace-visualize-sh/project/visualize-sh-newsletter-ed23ad28fbc0) | `P-WOR-2` | Recurring aggregated digest selection, templates, review handoff, signup/consent, sender setup, delivery, archive/cadence. |
| [visualize-sh-editorials](https://linear.app/workspace-visualize-sh/project/visualize-sh-editorials-b9e8941e27d5) | `P-WOR-3` | Owner-authored specialty articles, editorials, research articles, and topical histories such as LAAO/LAAC. |

Use the existing plural `visualize-sh-editorials` name returned by Linear. An
article may be linked from a digest without moving its research/writing issue to
newsletter. Shared catalog research belongs in webapp; the article issue links
to it. Split cross-project work by deliverable and add related/blocking links.

## Issue contract

Search the team and relevant project for matching outcomes, including completed
and archived issues, before creating a new issue. Reopen or extend a suitable
issue where appropriate; do not import an old design phase as undone work when
the current code/status record already implements it.

An actionable issue includes:

- A title stating the outcome, a short problem/current-state explanation, and
  the deliverable's scope.
- Repository paths, affected record IDs, and primary evidence or audit pointers.
  Findings in an audit remain review leads, not automatically verified facts.
- Observable acceptance criteria and the relevant validation/review gate.
- Project, one existing type label (`Bug`, `Feature`, or `Improvement`), relevant
  area/work labels, priority, and a milestone when useful.
- Blocking issues for true prerequisites; related links for context. Record a
  human/account dependency in the description when it has no issue yet.

Use `Area: News`, `Area: Atlas`, and `Area: Data` for product surfaces;
`Work: Evidence`, `Work: Delivery`, `Work: Article`, and `Work: Governance` for
the nature of work. Apply multiple areas only when the task affects them.
Do not duplicate project names as labels.

High means an evidence/publication blocker or important near-term foundation;
Medium is the default; Low is optional improvement. Reserve Urgent for an active
incident. Initial priorities express sequencing, not deadlines. Do not invent
due dates, estimates, or assignments.

## Lifecycle and completion

- **Backlog:** scoped work awaiting selection or dependencies.
- **Todo:** the next actionable queue; still inspect linked blockers before work.
- **In Progress:** active implementation, research, or review.
- **Done:** acceptance criteria actually met, with checks/evidence and remaining
  limits recorded. Completed local code is not completed delivery or author signoff.
- **Canceled / Duplicate:** obsolete work or a linked duplicate; preserve context.

The team has no custom review/blocked status. Keep factual signoff and blocked
account work open, document what is awaited, and use blocking links. Do not mark
an issue Done just because a PR or draft exists. Keep status summaries concise;
update substantive progress, decisions, validation, and new dependencies rather
than posting every tool result.

Use `codex/wor-<number>-<short-slug>` for newly created branches. Link the issue
from a PR and record the PR/artifact in the issue. For curation, list changed IDs,
exact evidence locators, draft/promotion decisions, and unresolved gaps. For an
article, the owner is the author and must approve interpretation and final copy.
For delivery, preserve explicit approval of the exact issue and recipients;
never place subscriber lists or credentials in Linear.

## Source and model rules

`AGENTS.md` defines Luna/Sol routing and bounded delegation. Use the smallest
available model and context that meet the task's verification requirements;
escalate conflicting evidence and integration to Sol. Delegate only independent
work whose value exceeds coordination cost. Models do not confer factual review
or publication approval.

`SOURCE_CURATION_POLICY.md` governs all three projects: public or legitimately
licensed documentary sources only; no podcasts/interviews/transcripts as factual
evidence; licensed access does not grant redistribution rights. New claims remain
draft and source located. Known gaps may remain unresolved after a documented
search; the issue is complete only if its stated deliverable permits that outcome.

## Initial backlog index

The issue links below are a dated seed inventory. Linear status and descriptions
are authoritative; do not maintain completion state in this table.

| Project | Issue | Outcome |
| --- | --- | --- |
| visualize-sh-webapp | [WOR-5](https://linear.app/workspace-visualize-sh/issue/WOR-5/codify-linear-routing-documentary-source-policy-and-lunasol-delegation) | Codify Linear routing, documentary source policy, and Luna/Sol delegation |
| visualize-sh-webapp | [WOR-6](https://linear.app/workspace-visualize-sh/issue/WOR-6/enforce-source-eligibility-and-reuse-provenance-in-the-evidence) | Enforce source eligibility and reuse provenance in the evidence pipeline |
| visualize-sh-webapp | [WOR-7](https://linear.app/workspace-visualize-sh/issue/WOR-7/verify-remaining-historical-device-identity-material-and-regulatory) | Verify remaining historical device identity, material, and regulatory gaps |
| visualize-sh-webapp | [WOR-8](https://linear.app/workspace-visualize-sh/issue/WOR-8/reconcile-missing-trial-identities-denominators-and-current-registry) | Reconcile missing trial identities, denominators, and current registry observations |
| visualize-sh-webapp | [WOR-9](https://linear.app/workspace-visualize-sh/issue/WOR-9/reconcile-current-tavr-labels-and-exact-size-comparison-measurements) | Reconcile current TAVR labels and exact-size comparison measurements |
| visualize-sh-webapp | [WOR-10](https://linear.app/workspace-visualize-sh/issue/WOR-10/complete-curator-review-of-draft-catalog-claims-and-held-news) | Complete curator review of draft catalog claims and held news |
| visualize-sh-webapp | [WOR-11](https://linear.app/workspace-visualize-sh/issue/WOR-11/review-unresolved-generation-and-clinical-outcome-comparison-mappings) | Review unresolved generation and clinical-outcome comparison mappings |
| visualize-sh-webapp | [WOR-12](https://linear.app/workspace-visualize-sh/issue/WOR-12/audit-public-evidence-figures-for-reuse-rights-attribution-and-exact) | Audit public evidence figures for reuse rights, attribution, and exact version provenance |
| visualize-sh-webapp | [WOR-13](https://linear.app/workspace-visualize-sh/issue/WOR-13/maintain-citation-identity-and-a-bounded-source-change-review-queue) | Maintain citation identity and a bounded source-change review queue |
| visualize-sh-newsletter | [WOR-14](https://linear.app/workspace-visualize-sh/issue/WOR-14/verify-the-recurring-aggregated-digest-draft-and-review-handoff) | Verify the recurring aggregated digest draft and review handoff |
| visualize-sh-newsletter | [WOR-15](https://linear.app/workspace-visualize-sh/issue/WOR-15/verify-zoho-signup-consent-sender-authentication-and-tracking) | Verify Zoho signup, consent, sender authentication, and tracking configuration |
| visualize-sh-newsletter | [WOR-16](https://linear.app/workspace-visualize-sh/issue/WOR-16/verify-public-digest-and-signup-urls-with-the-exact-content-delivery) | Verify public digest and signup URLs with the exact-content delivery check |
| visualize-sh-newsletter | [WOR-17](https://linear.app/workspace-visualize-sh/issue/WOR-17/complete-the-first-approved-aggregated-digest-delivery-cycle) | Complete the first approved aggregated digest delivery cycle |
| visualize-sh-newsletter | [WOR-18](https://linear.app/workspace-visualize-sh/issue/WOR-18/document-recurring-issue-cadence-archive-reconciliation-and-duplicate) | Document recurring issue cadence, archive reconciliation, and duplicate-send recovery |
| visualize-sh-editorials | [WOR-19](https://linear.app/workspace-visualize-sh/issue/WOR-19/define-the-author-led-specialty-article-and-source-to-claim-review) | Define the author-led specialty article and source-to-claim review workflow |
| visualize-sh-editorials | [WOR-20](https://linear.app/workspace-visualize-sh/issue/WOR-20/research-and-draft-the-authored-laaolaac-device-history-article) | Research and draft the authored LAAO/LAAC device history article |
| visualize-sh-editorials | [WOR-21](https://linear.app/workspace-visualize-sh/issue/WOR-21/develop-the-sapien-design-change-versus-indication-expansion-article) | Develop the SAPIEN design-change versus indication-expansion article |
| visualize-sh-editorials | [WOR-22](https://linear.app/workspace-visualize-sh/issue/WOR-22/develop-the-feops-predict-laa-simulation-evidence-article) | Develop the FEops PREDICT-LAA simulation-evidence article |
| visualize-sh-editorials | [WOR-23](https://linear.app/workspace-visualize-sh/issue/WOR-23/define-the-specialty-article-publication-and-newsletter-link-handoff) | Define the specialty article publication and newsletter-link handoff |

Shared Linear reference: [VISUALIZE-SH work organization and source policy](https://linear.app/workspace-visualize-sh/document/visualize-sh-work-organization-and-source-policy-5232e09368ad).

## Unfiled work when Linear is unavailable

None recorded. If needed, append a dated entry with proposed project, outcome,
evidence/paths, acceptance criteria, and dependency IDs. Replace it with the
confirmed Linear link after filing.
