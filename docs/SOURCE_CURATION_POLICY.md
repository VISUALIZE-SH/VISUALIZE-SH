# Source curation policy

Applies to News, Atlas, Data, graph records, recurring digests, authored articles,
citations, figures, and any agent research proposal. This policy supersedes older
plans that allow interview statements as attributed evidence.

## Eligible sources and access

Factual information must come from a publicly accessible documentary source or
a documentary source the owner is legitimately licensed to access and use.
Record `access: public` or `access: licensed` in intelligence source records.
Do not bypass access controls, use leaked/confidential material, or treat an
unavailable full text as reviewed. An institutional subscription supports access;
it does not automatically permit redistribution of the document or its figures.

Prefer the document that establishes the specific fact:

| Fact | Preferred evidence | Limit |
| --- | --- | --- |
| Authorization, indication, labeling, field action | Decision-specific regulator record, label/IFU, SSED, official notice | Preserve jurisdiction, generation, date, and indication; distinguish clearance, approval, coverage, and availability. |
| Trial identity/design/current status | Official registry, protocol, dated revision | Registry estimates differ from enrolled, randomized, treated, and analyzed counts. |
| Clinical or engineering result | Original study, results document, or original meeting abstract | Retain cohort, comparator, endpoint, method, follow-up, uncertainty, and preliminary status. |
| Specifications, materials, compatibility | Exact-model label/IFU, manufacturer technical document, original methods | No borrowing from a related generation or configuration. |
| Corporate event/product announcement | Official filing or original corporate disclosure | Attribute sponsor claims and check clinical/regulatory assertions against the corresponding primary evidence. |
| History or synthesis | Primary dated records, supported by eligible scholarly reviews | Reviews guide coverage and interpretation; trace material factual assertions to primary evidence where possible. |
| Patent association | Explicit public product-to-patent connection plus patent-office record | A matching assignee or similar invention alone does not connect a patent to a product. |

Public/licensed written reporting and reviews can support discovery and clearly
labeled secondary context. They do not establish quantitative outcomes, exact
specifications, authorization, or current status when primary confirmation is
missing. Hold that assertion in draft or record the gap. Official written
abstracts can support only the information actually visible in the abstract;
never infer tables, subgroups, methods, or full-text findings from it.

## Podcasts and interviews

Do not use podcasts, interviews, private conversations, audio/video recordings,
or their transcripts as factual evidence, even if public, licensed, or spoken by
an expert. This includes interview-derived quotations in written reporting.
Attribution does not make an interview assertion eligible for the factual record.

Such material may suggest a search question, but the resulting fact must be
independently established in an eligible documentary source. Cite that document,
not the conversation. A written technical release accompanying a podcast is
assessed as its own document and must independently support the assertion.

## Required provenance and review

For every material assertion, retain the canonical document URL or identifier,
title/publisher, publication date at its actual precision, retrieval date, source
class/access, exact page/table/figure/section locator, and the affected product
version, configuration, jurisdiction, or trial cohort. Separate event date,
publication date, retrieval date, and registry revision date.

Use existing schema fields; do not add unsupported YAML fields. Where license
terms, access limitations, or excerpt rights lack structured fields, record them
in source-linked curation notes or an ignored local evidence review packet and
link [WOR-6: source-policy enforcement](https://linear.app/workspace-visualize-sh/issue/WOR-6/enforce-source-eligibility-and-reuse-provenance-in-the-evidence).
Never put account credentials,
subscriber identifiers, or license account details in public notes.

1. Check source eligibility and the exact identity/scope before extraction.
2. Inspect the actual document; search snippets and a citation's existence do
   not prove its contents. Record abstract-only or inaccessible-full-text limits.
3. Extract only supported facts and their locators. Preserve conflicts and
   missingness rather than silently choosing a convenient value.
4. Keep changes draft; assemble the evidence packet and required software checks.
5. Have the applicable curator review factual records and the owner review
   authored articles before promotion or publication. Agent verification and
   successful validation are not substitutes for that review.

Keep existing IDs stable. Do not treat an owner note, previous model answer, or
existing curated field as documentary confirmation; preserve the note while
flagging any unsupported assertion for reconciliation. A source change opens a
review task; it never silently updates an approved fact.

## Public outputs and figures

Publish original concise summaries, citation metadata, and links within the
source's permitted use. Do not commit licensed full text, subscription exports,
private watchlists, or restricted snapshots. Public access and an FDA-hosted PDF
do not automatically establish rights to every third-party figure inside it.
Before publishing an image, confirm its reuse basis, record attribution/license,
verify the exact page/figure and version, and retain faithful crop metadata.
Unknown reuse rights mean link to the source and hold the image out of public
assets until resolved.

For device images, always prefer content submitted to FDA (the exact-version
SSED, labeling/IFU, or submission summary) when it provides a suitable image and
verified reuse basis. Record an unavailable or unsuitable FDA candidate before
using a commercially reusable open-access article as a fallback. Exclude
noncommercial-only licenses from distributed image assets. Keep author and
original figure credits, link the article and license, and disclose crops or
other permitted modifications. These preferences do not remove the rights and
version checks above.

`evidence:snapshot-document` currently accepts public allowlisted regulator/
registry URLs only. This policy permits licensed research but does not extend
that command's capabilities. Keep licensed review material in an approved local
location excluded from Git, and expose only permitted metadata/summaries.

## Applying the rule to existing records

Search authored records, citation collections, and the ignored local watchlist
for prohibited source classes and interview-derived assertions. Flag candidates
for documentary verification; do not mass-delete records or promote them merely
because a URL resolves. Track source/rights enforcement, legacy remediation,
and media review in the webapp project. Article-specific verification belongs in
editorials, while recurring story selection and delivery belong in newsletter.
