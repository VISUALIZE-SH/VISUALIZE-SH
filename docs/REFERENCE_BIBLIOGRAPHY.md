# Consolidated Evidence references

Therapy profiles, Explore detail cards, expanded Data cards, and comparison
cards share one Evidence component. It collects existing source links from
design claims, indications, regulatory decisions, clinical trials, registry
snapshots, cohorts, readouts, outcomes, endpoint definitions, history, lineage,
figures, configuration measurements, and directly related graph/trial/news
records. Original section links remain in place.

The list groups sources into Clinical data, Publications, Patents, Regulatory
documents, Product & technical sources, and Other sources. Canonical URLs and
verified DOIs deduplicate a document while preserving every locator and
context. A version-specific reference stays with the named version; a source
linked only to the therapy or family is labeled accordingly.

Export References downloads all collected sources in an alphabetized APA 7
HTML document. It includes verified authors, dates, journal/volume/issue,
pages or article numbers, DOI links, and patent numbers/offices where
applicable, with italics, double spacing, and hanging indents. Open the HTML in
a browser to print or save a PDF, or in a word processor. Missing publication
dates use `n.d.`; an unknown title uses a source-document descriptor. Retrieval
dates never become publication dates.

## Public-source research, 2026-10-04

Three Luna agents reviewed the LAAO, valve/repair, and remaining therapy
inventories, reusing existing authored research and public-source notes. The
[per-therapy audit](audit/2026-10-04-reference-research.json) covers all 100
therapies and records checked product documents, patent sources, qualifying
numbers, and limitations. The final compiled inventory contains 781 sources,
including 291 distinct patent records; counts in a product's Evidence section
reflect only its linked documents.

Patents qualify only through an explicit public connection to the named
product: a product/IFU reference, manufacturer virtual marking, an exact
approved-drug NDA entry in the FDA Orange Book, or another directly connected
public source. Exact patent numbers were then checked against Google Patents
and USPTO records. General topic searches, similar inventions, company-wide
portfolios, assignees, and patents merely cited by another patent do not
establish a product connection. Empty patent categories mean no qualifying
reference was found in the reviewed sources.

All 291 included patent records have verified titles, inventors, and issue
dates. The Corvia European record uses EP2424472B1, separately verified from
the A2 application publication. Article citation metadata covers 98 exact URL
aliases, resolved through DOI, PMID, PMC-to-PMID mapping, or original publisher
metadata. Duplicate DOI aliases share the same verified bibliographic fields.
Publication dates retain their recorded day, month, or year precision.

Named marking lists remain scoped to their stated product/generation. For
example, WATCHMAN FLX and FLX Pro have separate lists; those marks do not get
assigned to original WATCHMAN or the early 2015 FLX. SAPIEN 3 Ultra marking
remains a therapy-level reference with its generation limitation visible;
it does not establish exact Ultra RESILIA coverage. The FDA Orange Book audit
records the checked 2026 edition/supplement and exact NDA locator, without
inferring patents for investigational therapies.

## Maintaining the inventory

- Add sources and explicit product associations in
  `data/intelligence/catalog/references-*.yaml`. Preserve the public proof
  document, exact row/page locator, and scope statement in `patentConnection`.
- Update exact article metadata in `data/intelligence/citations.yaml`; keep
  source URLs and identifier resolution reviewable.
- Run `npm run build:intelligence`. Schema and semantic validation reject
  patent sources lacking a public non-patent product connection. The display
  independently enforces the same connection requirement.
- Run `npm run validate:local` and the production build after substantive
  changes. Reference regression tests cover aggregation, deduplication, exact
  generation mapping, escaping, APA author limits, date suffixes, and page
  ranges.
