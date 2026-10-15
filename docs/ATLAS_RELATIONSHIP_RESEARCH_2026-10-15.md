# Atlas relationship research and local prototype — October 15, 2026

Tracked in [WOR-35](https://linear.app/workspace-visualize-sh/issue/WOR-35/research-atlas-relationships-and-prototype-stable-organic-islands), following [the layout options](ATLAS_LAYOUT_OPTIONS_2026-10-15.md).

## Research result

A bounded documentary pass preceded layout implementation. Luna inventoried existing graph/catalog joins; Sol researched corporate/portfolio and patent sources; the coordinating agent independently checked material corporate findings and researched FDA/procedure and original-publication links. This is a more connected draft web, not a claim of exhaustive coverage or clinical signoff.

Added **22 source-located draft relationships**, five draft procedure categories (M-TEER, T-TEER, TMVR, TTVR, LAAC), one draft incubator (T45 Labs), and one draft original-publication-linked trial (CLASP TR EFS). Generated graph: **323 nodes / 505 edges**, versus 316 / 475 before the pass. All seven entity groups remain visible on initial Atlas render, including 71 companies and 100 trials.

The 30 additional edges comprise 22 separately sourced relationships, six condition associations for the five procedures, and two links from the new trial. Exact locators, source class/access, source publication and retrieval dates, event-date precision, affected scope, limitations, and independent draft status reside in [relationships.yaml](../data/relationships.yaml). Procedure/trial curation notes cross-reference their primary documents. No numerical clinical effect sizes or full-text subgroup results were extracted.

| Relationship class | Added | Meaning preserved |
| --- | ---: | --- |
| Device → procedure use | 11 | Product/generation, indication population and investigative versus commercial scope remain in the evidence. |
| Additional scoped condition target | 1 | Tendyne → MS only within the P240042 severe-MAC-associated population; no all-etiology claim. |
| Investigated condition | 1 | PASCAL → TR in CLASP TR EFS, distinct from a US marketing-authorization claim. |
| Investment | 3 | Boston–MiRus equity, Edwards–JenaValve convertible note, Corvia disclosed investor, and no implied control. |
| Conditional option | 1 | Boston's SIEGEL/TAVR asset option, not acquisition of MiRus. |
| Completed acquisition | 2 | Edwards–Endotronix completion and remaining Vectorious interest; correct completion-date precision. |
| Terminated acquisition | 1 | Edwards–JenaValve terminated merger agreement, not ownership. |
| Incubator portfolio | 2 | T45 Labs → Mitria and VahatiCor; does not identify fund ownership percentage. |


## Source register

All sources were publicly accessible documentary pages or PDFs retrieved October 15, 2026. No source full text or third-party image is redistributed. Undated pages remain undated. Original paper extraction was limited to the visible abstract, as noted in the trial/relationship records.

| Primary document | Published | Publisher / source class | Exact inspected locator |
| --- | --- | --- | --- |
| [P140031 Summary of Safety and Effectiveness Data](https://www.accessdata.fda.gov/cdrh_docs/pdf14/P140031B.pdf) | Undated | FDA / regulator | pp.1–2, II Indications for Use and V Device Description; index TAVR procedure; FDA decision/notice date 2015-06-17; document publication date not stated |
| [P130021S174 Summary of Safety and Effectiveness Data](https://www.accessdata.fda.gov/cdrh_docs/pdf13/P130021S174B.pdf) | Undated | FDA / regulator | pp.1–2, General Information and II Indications for Use; FDA decision/notice date 2025-08-28; document publication date not stated |
| [SIEGEL Transcatheter Aortic Valve](https://www.mirusmed.com/solutions/structural-heart/siegel-transcatheter-aortic-valve-2/) | Undated | MiRus / company | Product description and investigational-use notice |
| [P100009 Summary of Safety and Effectiveness Data](https://www.accessdata.fda.gov/cdrh_docs/pdf10/P100009B.pdf) | Undated | FDA / regulator | pp.1–2, II Indications for Use and V Device Description (leaflet coaptation); FDA decision/notice date 2013-10-24; document publication date not stated |
| [P220003 Summary of Safety and Effectiveness Data](https://www.accessdata.fda.gov/cdrh_docs/pdf22/P220003B.pdf) | Undated | FDA / regulator | pp.1–3, II Indications for Use, V Device Description, VI Alternative Practices and Procedures; FDA decision/notice date 2022-09-14; document publication date not stated |
| [P230007 Summary of Safety and Effectiveness Data](https://www.accessdata.fda.gov/cdrh_docs/pdf23/P230007B.pdf) | Undated | FDA / regulator | pp.1–2, II Indications for Use and V Device Description; FDA decision/notice date 2024-04-01; document publication date not stated |
| [1-Year Outcomes of Transcatheter Tricuspid Valve Repair](https://pubmed.ncbi.nlm.nih.gov/37137586/) | 2023-05-09 | JACC / PubMed / publication | Abstract: Objectives and Conclusions; DOI 10.1016/j.jacc.2023.02.049 |
| [P230013 Summary of Safety and Effectiveness Data](https://www.accessdata.fda.gov/cdrh_docs/pdf23/P230013B.pdf) | Undated | FDA / regulator | pp.1–2, II Indications for Use and V Device Description; FDA decision/notice date 2024-02-01; document publication date not stated |
| [P240042 Summary of Safety and Effectiveness Data](https://www.accessdata.fda.gov/cdrh_docs/pdf24/P240042B.pdf) | Undated | FDA / regulator | p.1, II Indications for Use; p.41, Benefit-Risk Determination; FDA decision/notice date 2025-05-23; document publication date not stated |
| [P130013/S035 PMA decision](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P130013S035) | Undated | FDA / regulator | Approval Order Statement; FDA decision/notice date 2020-07-21; document publication date not stated |
| [P200049 Summary of Safety and Effectiveness Data](https://www.accessdata.fda.gov/cdrh_docs/pdf20/P200049B.pdf) | Undated | FDA / regulator | pp.1–2, II Indications for Use and V Device Description; FDA decision/notice date 2021-08-14; document publication date not stated |
| [Boston Scientific Form 8-K](https://www.sec.gov/Archives/edgar/data/885725/000088572526000041/bsx-20260518.htm) | 2026-05-18 | Boston Scientific / SEC / filing | Item 8.01, Investment Agreement with MiRus LLC, paragraphs 1–4 |
| [Edwards Lifesciences 2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1099800/000109980026000009/ew-20251231.htm) | 2026-02-25 | Edwards Lifesciences / SEC / filing | pp.69–73, Notes 9–10: JenaValve, Purchase of noncontrolling interest, and Endotronix |
| [Investors](https://corviamedical.com/about-us/investors/) | Undated | Corvia Medical / company | Investors, opening paragraph naming funders |
| [Mitria Medical Partners with T45 Labs to Advance Novel Mitral Valve Repair Therapy](https://www.prnewswire.com/news-releases/mitria-medical-partners-with-t45-labs-to-advance-novel-mitral-valve-repair-therapy-302889421.html) | 2026-09-29 | T45 Labs / PR Newswire / company | Opening two body paragraphs; About Mitria Medical; About T45 Labs portfolio paragraph |
| [About T45 Labs](https://t45labs.com/about/) | Undated | T45 Labs / investor | Our Investment Funds → T45 Fund-I company list; VahatiCor named. T45 fund and incubator legal identities remain distinct. |

## Held and excluded findings

- **Patent search:** SAPIEN 3 IFU [DOC-0183029A](https://eifu.edwards.com/eifu/5970f1a946e0fb00015e5f4c/DOC-0183029A.pdf), revision December 2021, French section 11, printed p.8, supplies explicit system-level patent notices. Direct [USPTO retrieval for 7,895,876](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7895876) failed in this environment. No new patent association was accepted; system scope cannot be reassigned to a specific implant or Ultra/RESILIA generation. Existing catalog bibliography connections remain intact and accessible through node evidence.
- **WATCHMAN FLX:** the retrieved manufacturer [product-patent list](https://www.watchman.com/content/dam/bostonscientific/corporate/product-patents.pdf) had no verified matching product row in the bounded search. Hosting on a WATCHMAN domain is insufficient. A-FLUX search found no verified public product-to-patent mapping. No assignee- or title-based connection was added.
- **LSI:** inspected the public [Laplace spotlight](https://www.lifesciencemarketresearch.com/insights/lsi-alumni-innovator-spotlight-laplace-interventionals-ramji-iyer), title/opening paragraphs. It explicitly derives from a conversation; claims were excluded under the source policy. Existing Laplace research already has separate documentary records. Search results from broad industry trend/market-report pages supplied no additional verified identity-level relationship, so estimates were not imported. No licensed report was assumed reviewed.
- **Innovalve:** Edwards 2025 10-K Note 10, printed p.71, supports acquisition on October 1, 2024. Held from this prototype because no Innovalve company/product entity was needed for the selected existing-node bridges; do not conflate this with the July announcement/option exercise.
- **Medtronic VCVR:** literal identity/investment match unresolved. No guessed relationship added. Other source-led portfolio expansion can be a separate bounded research pass.
- No interview quotes, podcast/recording transcripts, private data, subscriber information, credentials, or copied source figures were used as factual additions.

## Prototype behavior and scope

Islands is the default, with Timeline retained and Clustered retired after owner review. Automatic framing starts at 0.525 zoom, 75% of the initial prototype; Fit to screen shows the full overview. Condition anchors use a deterministic presentation order and full-dataset membership density, not a disease taxonomy claim. Therapies use only direct recorded treatment/investigation edges. Procedures occupy inner satellites; companies and trials retain full context as outer/shared satellites. Corporate ownership and trial paths cannot introduce extra therapy targets.

Full-dataset coordinates are cached; filters and theme changes reuse them. Conditions are pinned in Islands. Hub labels spell out condition names except HFpEF/HFrEF; all groups use pulse-based font sizing. Shared labels list target abbreviations, mark investigation as “study”, and use * for source-scoped targets. The detail panel includes exact relationship scope, dates, review state, citations and locators. Hiding drafts also hides draft relationship records and target annotations. Existing entity type shapes/colors and draft/lifecycle borders are retained.

Source YAML, schema, semantic validator, TypeScript types, graph compiler and public payload were updated together. New records remain draft. The initial prototype was local-only; the owner subsequently approved committing all pending work, pushing, reviewing and merging its PR. This does not promote factual records or authorize newsletter scheduling/delivery.

## Validation

Focused checks cover relationship provenance/endpoint types, investigation versus treatment, no false Edwards–JenaValve ownership, deterministic/reordered layout, direct-target isolation from context paths, shared-node bridge placement, fixed anchors with changed label metrics, finite coordinates for every graph node, and footprint collisions. `npm run validate:local` and `VITE_BASE=/ npm run build` passed (125 tests). Browser checks found all 323 nodes visible initially (71 companies, 100 trials), all 21 hubs locked, zero model-coordinate drift across company filtering, theme changes, Timeline return and draft hide/restore, zero visible draft edges with drafts hidden, and zero anchor drift when accessibility changed. Selection preserves zoom. At 390px, page width stayed 390px and the full graph fit inside the canvas. Desktop, dark, narrow-screen and shared-target views were visually inspected using the Playwright skill; screenshots remain ignored under `output/playwright/`.

Shared therapy homes receive label-placement priority, followed by single-target therapies, then companies/trials. This prevents context labels from expelling a shared therapy from its bridge. Label clearances can move a shared node away from an exact midpoint; target abbreviations and source details resolve the ambiguity. Dense overview labels still require zoom. No user study or exhaustive relationship search was performed, and all new factual records await curator review.

Final integration review verified the renamed Islands/Timeline controls and 0.525
opening zoom. All 323 nodes remain enabled (71 companies/100 trials), with zero
coordinate drift across filtering, theme changes and Timeline return. Draft hide
removes draft edges and annotations; Fit retains the full overview. Independent
Sol review found and corrected Timeline losing draft/investigation line styles;
the regression check covers both layouts. Final validation passed all 126 tests,
root-path production build and whitespace checks.
