# Data thumbnail artwork

`device-schematics.json` maps exact product-version IDs to the original orthographic
SVG illustrations approved by the owner on October 20, 2026. The owner also
approved the Data UI integration, Atlas recovery fix, and PR/review/merge workflow
on October 20, 2026. Integration is tracked in WOR-12 and WOR-40.

The 95 SVGs in `public/evidence/schematics/` are byte-for-byte copies from the final
local schematic catalog. Their hashes, source metadata and illustration limits
are retained in the registry. Ten are explicitly labeled concepts; three others
retain their approximate scope. Approval of this artwork does not amend clinical
claims, authorization, engineering accuracy or source-image reuse rights.

The nine held versions have no illustration. Data shows the two-circle question
mark placeholder for these and any future unmapped device version, without using
a related generation or legacy source figure. A failed image load also uses that
placeholder. Existing documentary figures remain available in the Figures view.

`scripts/device-illustrations.test.ts` checks exact inventory coverage, held gaps,
approved SVG hashes and visible schematic/concept/not-to-scale labels.

Regenerate the small UI index after changing the registry with
`node --import tsx scripts/sync-device-thumbnails.ts`. Tests enforce that the index
matches the approved register; source metadata is not bundled into the UI.

## Therapy snapshots approved October 23, 2026

`therapy-schematics.json` retains the 18 final refinement-v2 illustrations approved
by the owner, including Data integration and public PR/review/merge. These map to
graph therapy IDs, which currently have no exact-version records. They appear in
the Data Specs **Therapy snapshots** table, with the pictured configuration,
limitations and source links. They never substitute for exact-version artwork or
clinical evidence. The table follows condition/search filters and is hidden when
an exact version or historical date is selected; graph snapshots are undated and
do not establish jurisdiction-specific authorization. Exports identify this scope.

Only the SVG review-state captions changed for publication. Drawing paths are
unchanged; both the original approved hash and published hash are retained. These
are original line drawings, with no copied source pixels, traced paths or source
figures. Artwork approval does not establish production fidelity, clinical-build
equivalence or permission to redistribute the referenced source images. Source
locators and depiction limits were carried from the reviewed local packet;
publication did not perform new research or promote factual records.

`therapy-thumbnail-index.json` contains the display metadata and source/limit text
used in expandable snapshot rows. Every unillustrated or failed Data thumbnail,
including drugs, digital tools, procedures and unresolved families, uses the same
two-circle question mark. Existing documentary figures remain in Figures.
