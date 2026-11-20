# Data thumbnail artwork

`device-schematics.json` maps exact product-version IDs to original orthographic
SVG illustrations. The public registry carries source metadata, asset digests
and substantive depiction limits. Review records are maintained privately.

The registry includes 103 illustrated exact versions. The additional eight
version entries and sixteen therapy snapshots include oblique, front and top
SVGs in `public/evidence/schematics/`. Their drawing fingerprints cover the
geometry, layout and styling independently of publication labels. Readers can
open the three views in the corresponding Data row. Each set carries the
depicted configuration, documentary locators and substantive depiction limits.

The 30 held versions have no illustration. Data shows the two-circle question
mark placeholder for these and any future unmapped device version, without using
a related generation or legacy source figure. A failed image load also uses that
placeholder. Existing documentary figures remain available in the Figures view.

`scripts/device-illustrations.test.ts` checks exact inventory coverage, held gaps,
approved SVG hashes and visible schematic/concept/not-to-scale labels.

Regenerate the small UI index after changing the registry with
`node --import tsx scripts/sync-device-thumbnails.ts`. Tests enforce that the index
matches the authored register. Artwork detail views include reader-facing
source locators.

## Therapy snapshots

`therapy-schematics.json` retains 34 original therapy illustrations. These map to
graph therapy IDs, which currently have no exact-version records. They appear in
the Data Specs **Therapy snapshots** table, with the pictured configuration,
limitations and source links. They never substitute for exact-version artwork or
clinical evidence. The table follows condition/search filters and is hidden when
an exact version or historical date is selected; graph snapshots are undated and
do not establish jurisdiction-specific authorization. Exports identify this scope.

The registry records the published SVG hashes and source locators. These are
original line drawings. The referenced source images are available from their
respective publishers. Pictured details retain their stated configuration and
scope.

`therapy-thumbnail-index.json` contains the display metadata and source/limit text
used in expandable snapshot rows. Every unillustrated or failed Data thumbnail,
including drugs, digital tools, procedures and unresolved families, uses the same
two-circle question mark. Existing documentary figures remain in Figures.
