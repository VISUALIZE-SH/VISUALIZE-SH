# Catalog fragments

Each `*.yaml` file here adds product families, versions, sources, regulatory
decisions, and compact spec values to the intelligence build. Fragments are
merged with `../pilot.yaml` and `../taxonomy.yaml` by `npm run build:intelligence`
and validated by the same schema and semantic checks. One file per device or
drug class keeps parallel curation reviewable.

```yaml
observedAt: '2026-09-23'          # default extraction date for every spec value
sources:                          # new SourceDocument records (see pilot.yaml)
  - id: src-navitor-ssed
    title: Navitor TAVI system SSED
    url: https://www.accessdata.fda.gov/cdrh_docs/pdf19/P190023S014B.pdf
    kind: regulatory              # regulatory | registry | publication | patent | manufacturer | technical | other
    publisher: FDA
    publishedAt: { value: '2023-01-13', precision: day }
    retrievedAt: '2026-09-23'
    access: public
    identifier: P190023/S014
families: []                      # new ProductFamily records; entityIds/conditionIds must exist in data/*.yaml
versions: []                      # new ProductVersion records (reviewStatus: draft)
decisions: []                     # RegulatoryDecision records; the first US decision feeds the Data table
media: []                         # EvidenceMedia device figures (see figures.yaml); first `design` figure is the thumbnail
specs:
  - version: ver-navitor
    category: aortic-tavr-valves  # adds the version to that taxonomy category
    source: src-navitor-ssed      # default sourceId for the values below
    values:
      frame-material: { value: Nitinol, loc: 'PDF p.2, Section V' }
      available-sizes: { value: '23, 25, 27, 29 mm', loc: 'PDF p.3, Table 2' }
      leaflet-position: { availability: not_publicly_disclosed, loc: 'Section V (not stated)' }
      delivery-sheath:
        value: 14 Fr equivalent (23–25 mm); 15 Fr equivalent (27–29 mm)
        loc: 'PDF p.4, Section V.B'
        source: src-navitor-ifu     # overrides the default source
        context: FlexNav sheathless delivery; value is an equivalent sheath size, not measured OD.
```

Rules:

- Value keys must be standard attribute IDs from `../taxonomy.yaml` that apply to
  the named category. Each value compiles to a draft claim
  `claim-<version-suffix>-<attribute>`; do not repeat an attribute already carried
  by a claim in `pilot.yaml`.
- Keep `value` short enough for a table cell (about 80 characters). Put
  qualifiers in `context` and caveats in `limitation`.
- Every value needs a public source and a precise `loc` (page, table, section).
  Omit a value rather than guessing. Use `availability: not_publicly_disclosed`
  only when the source was checked and does not disclose the value.
- `basis` defaults to `directly_reported`; use `derived` when a value is summarized
  from several places in the source. Analyst interpretation is not allowed.
- `pivotal-trials` names the trial(s) behind the US authorization. It never
  carries an outcome number.
- Add the decision that introduced each generation (often a PMA supplement);
  the Data "US approval" column shows each version's earliest decision.
- Figures come from public FDA documents, or from publications only under an
  explicit CC BY license named in the caption. Store FDA images under
  `public/evidence/fda/` and publication images under
  `public/evidence/publications/` (longest side ≤ 480 px, ≤ 80 KB).

## Consolidated references

`references-{laao,valves,other}.yaml` adds public product-linked sources and
`bibliography` records. Existing claim, design, trial, and regulatory source links
remain in their original sections. The build also collects existing therapy,
related trial, and news URLs from the graph. All of these appear in the shared
Evidence section, grouped by source kind, with one entry per document.

Each bibliography entry needs `id`, `entityIds`, `versionIds`, `sourceRefs`, and
`reviewStatus`. At least one entity or version must be named. Use `versionIds`
only when the source explicitly identifies that generation. An entity-only
reference remains labeled as a therapy/family reference in version profiles.

A patent source must use `kind: patent` and provide `citation.patentNumber` and
`citation.patentOffice`. Its bibliography entry must also provide
`patentConnection: { sourceId, locator, statement }`, identifying a public
non-patent document that explicitly connects that patent number to the named
product. Manufacturer patent marking, an explicit product/IFU reference, and
an exact approved-drug NDA entry in the FDA Orange Book qualify. Subject,
inventor, assignee, or company-portfolio similarity does not qualify. Both
semantic validation and the Evidence view enforce this connection.

`../citations.yaml` supplements exact existing URLs with verified article
titles, authors (APA surname/initials), journal, volume, issue, pages or article
number, DOI, and publication date. Preserve the precision of the source date.
Do not substitute retrieval dates for publication dates or invent missing
authors. The APA export uses `n.d.` and a document descriptor when metadata is
unavailable. The public research audit and methodology are in
`../../../docs/REFERENCE_BIBLIOGRAPHY.md`.
