# LAAO device image curation

Retrieved and checked 2026-10-04. Tracked in
[WOR-12](https://linear.app/workspace-visualize-sh/issue/WOR-12/audit-public-evidence-figures-for-reuse-rights-attribution-and-exact),
related to [WOR-6](https://linear.app/workspace-visualize-sh/issue/WOR-6/enforce-source-eligibility-and-reuse-provenance-in-the-evidence).
Authored records: [figures-laao.yaml](../data/intelligence/catalog/figures-laao.yaml).
Redistribution credits accompany the assets in
[LAAO-ATTRIBUTION.md](../public/evidence/publications/LAAO-ATTRIBUTION.md)
and are embedded in PNG text metadata.

## Source preference and reuse basis

Prefer exact-version FDA-submitted figures when their reuse basis is established.

The [FDA website policy](https://www.fda.gov/about-fda/about-website/website-policies)
permits reuse unless otherwise noted; preserve any third-party rights notice in
the actual submission. Public hosting alone does not resolve figure authorship.
The preference and commercial-distribution constraint are recorded in
[SOURCE_CURATION_POLICY.md](SOURCE_CURATION_POLICY.md).

The supplied RCM article states **CC BY 4.0**, rather than CC BY-SA. The checked
PDF and publisher page agree. All eight added images use
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), which permits commercial
reuse with credit, license link and disclosure of modifications. Checked article
copyright/license statements and figure captions contain no separate exclusion
for the selected panels. Original manufacturer courtesy credits are retained;
they identify the image credit without asserting that the manufacturer grants a
separate license. No source is treated as public domain merely because it is open
access. Reassess any later-found figure-specific restriction before promotion.

## Asset sources

| Article / canonical source | Publication | Licensed figures used / original credit |
| --- | --- | --- |
| Xinqiang Han and David G. Benditt, [Percutaneous Left Atrial Appendage Occlusion Therapy: Evolution and Growing Evidence](https://www.imrpress.com/journal/RCM/24/7/10.31083/j.rcm2407211), DOI 10.31083/j.rcm2407211 | Reviews in Cardiovascular Medicine 24(7):211; 2023-07-19 | Fig.1B left ACP, credit St. Jude Medical; Fig.2A legacy WATCHMAN, credit Boston Scientific. Article CC BY 4.0. |
| Suradi and Hijazi, [Left atrial appendage closure: outcomes and challenges](https://link.springer.com/article/10.1007/s12471-016-0929-0), DOI 10.1007/s12471-016-0929-0 | Netherlands Heart Journal 25:143–151 (2017); first online 2016-12-09 | Fig.2a PLAATO, courtesy Boston Scientific; Fig.2d WaveCrest, courtesy Coherex Medical. © The authors 2016, CC BY 4.0. |
| Bai et al., [A newly designed disk-lobe occluder with isogenous barbs for left atrial appendage closure: Initial multicenter experience](https://www.frontiersin.org/journals/cardiovascular-medicine/articles/10.3389/fcvm.2022.974994/full), DOI 10.3389/fcvm.2022.974994 | Frontiers in Cardiovascular Medicine 9:974994; 2022-09-02 | Fig.1A LACbes photograph. © 2022 Bai et al., CC BY 4.0. |
| Ren et al., [Two-Year Outcome From Combining Cryoballoon Ablation and Left Atrial Appendage Closure: CLACBAC Study](https://www.frontiersin.org/journals/cardiovascular-medicine/articles/10.3389/fcvm.2020.610537/full), DOI 10.3389/fcvm.2020.610537 | Frontiers in Cardiovascular Medicine 7:610537; 2021-01-11 | Fig.3A Lefort, identified as Shape Memory Alloy Co., Shanghai. © 2021 Ren et al., CC BY 4.0. |
| Sommer et al., [Preclinical Assessment of a Novel Conformable Foam-Based Left Atrial Appendage Closure Device](https://pmc.ncbi.nlm.nih.gov/articles/PMC8213491/), DOI 10.1155/2021/4556400 | BioMed Research International 2021:4556400; June 2021 | Fig.1b right, large preclinical CLAAS implant. © 2021 Sommer et al., CC BY 4.0. June precision retained because publisher/repository day metadata differs. |
| Batko, Litwinowicz, Kapelak and Bartuś, [First-in-Human Percutaneous Epicardial-Only Left Atrial Appendage Closure Using Sierra Left Atrial Appendage Ligation System](https://pmc.ncbi.nlm.nih.gov/articles/PMC11642118/), DOI 10.3390/jcm13237417 | Journal of Clinical Medicine 13:7417; 2024-12-05 | Fig.3 Sierra Aegis system working end. © 2024 Batko et al., CC BY 4.0. |

## Faithful extraction and scope

| Asset / version | Exact extraction | Scope and modifications |
| --- | --- | --- |
| `watchman-original.png` / `ver-watchman-original` | Han PDF p.6, Fig.2A, third implant (27 mm) | Legacy WATCHMAN 2.5, not FLX. Device rectangle; other sizes and labels omitted. |
| `amplatzer-cardiac-plug.png` / `ver-amplatzer-cardiac-plug` | Han PDF p.5, Fig.1B, left implant | ACP I, not ACP II/Amulet. Full implant outline and visible proximal attachment retained. Adjoining B label clipped in empty background. Fig.1C side view was rejected because its source photograph clips the disc. |
| `plaato.png` / `ver-plaato` | Suradi PDF p.3 / journal p.145, Fig.2a | Device rectangle. Small adjoining panel letter omitted by clipping an empty-background corner; device pixels unchanged. |
| `wavecrest.png` / `ver-wavecrest` | Suradi PDF p.3 / journal p.145, Fig.2d | Device rectangle with anchors and short proximal attachment retained; surrounding labels omitted. |
| `lacbes.png` / `ver-lacbes` | Bai PDF p.3, Fig.1A; left part of embedded raster Im1 | Original 2805×1281 raster, crop `[0,0,1240,1281]`. Separate PDF panel-letter overlay and annotated Fig.1B omitted. Fig.1A caption wording says “Side view of left atrial appendage”; visual inspection and adjacent text establish the shown object as the occluder. |
| `lefort.png` / `ver-lefort` | Ren PDF p.4, Fig.3A | Historical Lefort device identified in caption; no transfer to a later branded successor. Other comparison devices/labels omitted. |
| `claas.png` / `ver-claas` | Sommer original repository Fig.1 image, panel b, right large implant | Preclinical large configuration; does not establish current AcuFORM design. Source image is 615×530 pixels; crop `[161,191,146,113]`. Adjoining callout lettering clipped in empty background. Low native resolution retained; no generated detail. |
| `sierra.png` / `ver-sierra` | Batko PDF p.4, Fig.3 | Working end/loop and cutter component of Sierra Aegis system; not a photograph of a permanent implant or the entire delivery assembly. Surrounding caption/page content omitted. |

All rectangular YAML crops use a normalized top-left origin (`x`, `y`, `width`,
`height`). The canvas is the complete PDF page except CLAAS, whose canvas is the
original repository figure image, explicitly stated in its locator. Page crops
were rendered at 300 dpi except LACbes, extracted from the embedded original
raster. No device was redrawn, recolored, enhanced with generated detail, or
composited with another configuration. Empty-background corner clips omit
adjoining lettering without altering the device. PNG metadata includes the
article, locator, license, attribution and retrieval date.

## Retrieved document endpoints

The following public endpoints identify the sources used for distributed assets.

- Han/Benditt [publisher PDF](https://storage.imrpress.com/IMR/RCM18032/application/2153-8174-24-7-211.pdf).
- Suradi/Hijazi [publisher PDF](https://link.springer.com/content/pdf/10.1007/s12471-016-0929-0.pdf).
- Bai [publisher PDF](https://www.frontiersin.org/journals/cardiovascular-medicine/articles/10.3389/fcvm.2022.974994/pdf).
- Ren [publisher PDF](https://www.frontiersin.org/journals/cardiovascular-medicine/articles/10.3389/fcvm.2020.610537/pdf).
- Sommer [Europe PMC full-text XML](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8213491/fullTextXML) and [original PMC figure image](https://cdn.ncbi.nlm.nih.gov/pmc/blobs/fb5b/8213491/a39f16145141/BMRI2021-4556400.001.jpg). Article XML supplies the caption, device context, author list and CC BY 4.0 statement.
- Batko [Jagiellonian University author-repository PDF](https://ruj.uj.edu.pl/server/api/core/bitstreams/9331cb70-14d1-4f37-af36-7f592fbc3799/content). This copy contains the article DOI, authors, figure and CC BY 4.0 statement.

No image is a claim of authorization, commercial availability, current design,
or interchangeability with another generation. Human review of the exact image,
rights and version remains required before promotion.

## Asset integrity

The following digests identify the distributed asset versions.

| Asset | Pixels | SHA-256 |
| --- | --- | --- |
| `watchman-original.png` | 320×270 | `1ed9aec2896c353ed2368cf9414a81a35e134c17717f24f9b707c54695b9ade0` |
| `amplatzer-cardiac-plug.png` | 494×493 | `f168cc91d8e16ba0633aab23281830e892a89bd31eba88676d8424579d9b5369` |
| `plaato.png` | 733×789 | `5d33c11b4d5a7b9e4b8d73c191a5a1ceb5ef038a6ae64e8f3cdc018b2d0fcab4` |
| `wavecrest.png` | 539×626 | `9700780225c6756862023804aaa608987c38238a509fb99b8f02cb82e78e090e` |
| `lacbes.png` | 1240×1281 | `6cdcd3a3eecc2bcfb84382fb093552d54770fee47a29ff9c8cd7380c6ecae913` |
| `lefort.png` | 564×457 | `2402f10031653895d28325d9cef4e02d94376cbd5509c81e69e75338fdcf21b3` |
| `claas.png` | 146×113 | `4fb7bf564fbc422aae67ea6ba6fde16489215ee24aaab86d5a734a4126590d86` |
| `sierra.png` | 1120×498 | `065d8db474c2e2f69d82eb3169900ebb9bb0f1f26c5aaee7730fff8791e821e5` |
