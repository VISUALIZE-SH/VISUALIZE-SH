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
