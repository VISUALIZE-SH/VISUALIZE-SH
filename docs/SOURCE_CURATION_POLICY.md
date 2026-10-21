# Source curation policy: publication acceptance criteria

Applies to News, Atlas, Data, graph records, recurring digests, authored articles,
citations, figures, and every export bundle or manual edit that proposes a factual
change. It states what a record must carry to be merged and published here. The
research method (how to find, open, and extract from sources) lives only in the
owner's private research engine; see `AGENTS.md`. This policy supersedes older
plans that allow interview statements as attributed evidence.

## Eligible source and access

Every material assertion must rest on a publicly accessible documentary source or
a documentary source the owner is legitimately licensed to access and use. Record
`access: public` or `access: licensed` in intelligence source records. Leaked or
confidential material, bypassed access controls, and unavailable full text treated
as reviewed are not acceptable. An institutional subscription supports access; it
does not automatically permit redistribution of the document or its figures.

The source must be of the kind that establishes the specific fact:

- Authorization, indication, labeling, field action: a decision-specific regulator
  record, label/IFU, SSED, or official notice, with jurisdiction, generation, date,
  and indication preserved. Clearance, approval, coverage, and availability stay
  distinct.
- Trial identity, design, or status: the official registry, protocol, or dated
  revision. Registry estimates stay separate from enrolled, randomized, treated,
  and analyzed counts.
- Clinical or engineering result: the original study, results document, or original
  meeting abstract, with cohort, comparator, endpoint, method, follow-up,
  uncertainty, and preliminary status retained. An abstract supports only what is
  visible in it.
- Specifications, materials, compatibility: the exact-model label/IFU or
  manufacturer technical document. No borrowing from a related generation or
  configuration.
- Corporate event or product announcement: an official filing or original
  corporate disclosure, attributed as a sponsor claim. Clinical and regulatory
  assertions in it need the corresponding primary evidence.
- Patent association: an explicit public product-to-patent connection plus the
  patent-office record. A matching assignee or similar invention is not a
  connection.
- History or synthesis: primary dated records; eligible scholarly reviews guide
  interpretation but material factual assertions trace to primary evidence.

Written reporting and reviews may support clearly labeled secondary context. They
do not establish quantitative outcomes, exact specifications, authorization, or
current status without primary confirmation; hold such an assertion in draft or
record the gap.

Podcasts, interviews, private conversations, audio/video recordings, and their
transcripts are never factual evidence, even if public, licensed, or spoken by an
expert. This includes interview-derived quotations in written reporting. A fact
first heard there must be independently established in an eligible document, and
that document is the citation. A written technical release accompanying a podcast
is assessed as its own document.

## Provenance and locators

For every material assertion the record retains the canonical document URL or
identifier, title and publisher, publication date at its actual precision,
retrieval date, source class and access, the exact page/table/figure/section
locator, and the affected product version, configuration, jurisdiction, or trial
cohort. Event date, publication date, retrieval date, and registry revision date
stay separate.

Use existing schema fields; do not add unsupported YAML fields. Where license
terms, access limitations, or excerpt rights lack structured fields, record them
in source-linked curation notes and track the enforcement gap in
[WOR-6: source-policy enforcement](https://linear.app/workspace-visualize-sh/issue/WOR-6/enforce-source-eligibility-and-reuse-provenance-in-the-evidence).
Never put account credentials, subscriber identifiers, or license account details
in public notes.

## Scope and unknowns

- The record names the exact product version, configuration, jurisdiction,
  indication, and trial cohort it describes. A fact is never carried across
  generations, cohorts, jurisdictions, or indications without supporting evidence.
- Unknown values are explicit (`not_publicly_disclosed`, `not_yet_reviewed`,
  `not_applicable`, or `conflicting` where the schema defines them). Conflicts and
  missingness are preserved, not replaced by a convenient value.
- A search snippet or a citation's mere existence does not show a document's
  contents. Abstract-only and inaccessible-full-text limits are recorded.
- An owner note, previous model answer, or existing curated field is not
  documentary confirmation; flag any unsupported assertion for reconciliation.

## Review state

- New factual records are draft, with sources and locators, until the applicable
  curator review; the owner reviews authored articles before publication. Agent
  verification and passing validation are not substitutes for that review.
- Existing IDs stay stable. A source change opens a review task; it never silently
  updates an approved fact.
- A record that arrives from an export bundle meets the same criteria. The bundle's
  PR notes list its sources, limits, and the review state recorded from the owner's
  approval in the engine; the public diff is reviewed before it is committed.

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

Licensed review material stays in an approved local location excluded from Git;
expose only permitted metadata and summaries.

## Existing records

Legacy records that do not meet these criteria are flagged for documentary
verification through the research engine; do not mass-delete them or promote them
merely because a URL resolves. Track source/rights enforcement, legacy remediation,
and media review in the webapp project. Article-specific verification belongs in
editorials, while recurring story selection and delivery belong in newsletter.
