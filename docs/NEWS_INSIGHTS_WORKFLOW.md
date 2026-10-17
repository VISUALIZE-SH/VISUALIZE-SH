# Manual News Insights workflow

News Insights is a recurring analytical feature of VISUALIZE-SH. It uses Format A
to explain consequential changes, borrows Format B for credible connections, and
ends with Format C’s next consequential question. Its topics emerge from the
window; owner-authored specialty histories/research remain Editorial.

The owner runs generation manually. Aim for roughly two weeks between editions;
in a quiet period the owner may wait about a month. There is no scheduled task.

## Template and sources of truth

- [Generation template](../prompts/news-insights.md): the instructions an agent
  should read and execute on a manual request, including Luna/Sol extraction,
  connections, critique, and coordinator verification.
- [Article starter](../templates/news-insights/article.yaml): copy and fill after
  freezing a run; placeholders are intentionally not a validated edition.
- `data/news-insights/YYYY-MM-DD.yaml`: authored draft copy, citations, source
  locators, original table/figure, selected News IDs, and validated paragraph/table context routes and optional Atlas capture.
- `schema/news-insights.schema.json`: the local draft contract. These article
  records are not imported into public graph/data builds or sendable digests.
- Ignored `artifacts/news-insights/runs.json`: local run ledger. It survives
  ordinary local reruns but is not shared through Git. If this ledger is missing
  on another checkout/machine, reconcile the intended boundary with the owner;
  do not invent a prior run or reset silently.

## Window semantics

Use the last **completed generation run date through the current run date**,
inclusive, in America/Los_Angeles. Suppress unchanged records already seen at
the previous checkpoint using content fingerprints. New records on the boundary
date remain eligible; changed records are marked for document verification.
Changing only `reviewStatus` does not manufacture news. News Insights/Editorial
input records are excluded to avoid self-reference.

For the first run, the owner supplies an explicit starting date. The inaugural
edition is September 30–October 13, 2026, fourteen inclusive calendar dates.
Later intervals are controlled by actual run dates; a monthly gap is not truncated
to fourteen days. New older-publication backfills are listed separately rather
than narrated as in-window developments. Initial older records establish a
baseline, not a claim of new backfill discovery.

When the owner explicitly requests a different coverage window, use
`--window-from YYYY-MM-DD` (API: `prepareRun({ runDate, windowFrom })`). This
deliberate override records `windowBasis: owner-explicit` and retains the actual
previous completed run date and cumulative fingerprints. In-window unchanged
records become `revisited` candidates for fresh analysis; this reason does not
assert a new development or changed source. New/updated candidates and older
backfill classification retain their existing meanings relative to the explicit
window. Unchanged older records stay suppressed. Do not silently choose this
override for an ordinary next edition.

`--from` retains its first-run meaning; after a completed checkpoint it may only
match that checkpoint. It cannot be combined with `--window-from`. An explicit
override can also establish a first run when the owner specifies that window.
Preparing an override does not advance the checkpoint. Successful rendering
advances it to the actual run date, so the next ordinary edition starts there.

Preparing a run freezes the candidate snapshot. Failed, unfinished, and deferred
attempts do not advance the completed boundary. Revising the same run date reuses
its snapshot and does not create another edition or checkpoint. To regenerate
against a corrected inventory, deliberately reconcile the local manifest/ledger
with the owner rather than quietly replacing the frozen input.
An override cannot replace a same-date frozen window, even when its start matches
a run prepared with the default basis. An explicit same-date rerun must match
both its saved start and `owner-explicit` basis; omitting the option reuses the
saved snapshot. Use the same override option when explicitly restating its window,
and deliberately reconcile a mismatched frozen run before preparation.

## Manual sequence

```sh
# First edition only:
npm run news-insights:prepare -- --date 2026-10-13 --from 2026-09-30

# Later manual edition (use its actual Los Angeles calendar date):
npm run news-insights:prepare -- --date YYYY-MM-DD

# Only for the owner's explicit overlapping October 2–15 coverage request:
npm run news-insights:prepare -- --date 2026-10-15 --window-from 2026-10-02

# After extraction, drafting, critique and coordinator factual checks:
npm run news-insights:render -- --date YYYY-MM-DD
```

Preparation writes `artifacts/news-insights/YYYY-MM-DD/run.json`. Read its
candidates and backfill IDs, then follow the generation template. Copy/fill the
starter or use the prior edition’s structure without carrying forward its topics.

Rendering validates schema, the frozen dates and selected IDs, source references,
paragraph citation requirements, table dimensions, graph nodes, and exact-version
pointers. It creates local `article.md`, `preview/index.html`, and a draft
`news-item.json`. Only after successful rendering does it checkpoint the run.
The checkpoint means local generation completed; it does not mean author/factual
approval, public availability, or delivery. A same-date rerender is idempotent.

The renderer has no publication/delivery switch. Draft feed metadata uses an
intended future public URL, which is not asserted to exist; the review-site copy
rewrites it to a local article route. Do not insert that record into authored News
or promote it until the article and actual public destination are approved.

## Review surfaces

`npm run news-insights:preview -- --date YYYY-MM-DD` prepares an ignored copy of
the production app under that run’s `site-preview/`, the article, a template
reading view, and a review hub. It includes draft News only in this copy, with a
local review banner and draft prefixes. Authored Editorial readers from `data/editorials/index.yaml` are rendered into this
copy, including drafts, and their News links are rewritten locally. Production builds
render only reviewed Editorials. The current LAAO Part 1 reader uses the owner-requested
publication date; a separate Part 2 author draft is linked only from the review hub
when its ignored local artifact is available.

The command uses the current `dist/`; run `VITE_BASE=/ npm run build` before it
after app changes. Then serve the review copy with:

```sh
npm run news-insights:serve -- --date YYYY-MM-DD --port 5175
```

The server binds only to `127.0.0.1`. Open `/review.html`, the article, the template,
and the News date window. Inspect desktop/mobile layouts, source links, tables,
figure labels, and navigation into Atlas/Data. The preview copy cannot alter
authored review states or a public payload.

## Content identity and style

News schema/types now accept optional `contentType: news | news-insights |
editorial`. Omission means ordinary News. Both News surfaces highlight the existing metadata keyword with brand-purple
background and bold white **News Insights** or **Editorial** text. The keyword
appears once in the metadata row; no separate duplicate pill is added. Ordinary
News retains its existing keyword styling. Labels derive only from the explicit field,
never from a headline/topic guess; the main News search includes the label.

Use an academic, objective voice and concise descriptive headings. Aim for
450–650 prose words, excluding tables, captions, and source provenance. Preserve
material identity, cohort, endpoint, validation, and uncertainty distinctions
when shortening. Avoid reveal language and lengthy contrast constructions.

Paragraph/table `contextLinks` open existing Data versions or Atlas nodes.
Broad lineage/condition links must be labeled as context when study-specific
structured evidence is unavailable. Optional `atlasSnapshot` images are actual
local JPEG captures of a selected Atlas neighborhood, with a link back to the
interactive view. Keep captions explicit about draft relationships and limits;
rendering fails if a declared capture is missing.

Original table/figure captions distinguish facts, interpretations, announced
capabilities, and questions for evaluation. No third-party figure reuse is
implied. Citations retain exact document/version/cohort scope and access limits;
missing structured outcomes in Data stay missing. The prototype is not a
cross-class effectiveness comparison or an automatic graph-difference engine.

## Tracking and validation

The manual recurring template/run work belongs in `P-WOR-2` and links to the News
UI contract deliverable in `P-WOR-1`. Standalone specialty articles remain in
`P-WOR-3`. While the owner requires local-only work, pending proposals live in
`docs/LINEAR_WORKFLOW.md`; search existing issues before any external filing.

Focused checks cover boundary dates, monthly gaps, deduplication, reruns, backfills,
schema/source/date/identity errors, and real rendered badges. For app/data-contract
changes also run `npm run validate:local`, `VITE_BASE=/ npm run build`, and
`git diff --check`. Add an ignored `review.md` with material source checks,
delegation/critique changes, exclusions, visual QA, and remaining limits.

Author selection, factual signoff, public rendering/publication, and newsletter
delivery are separate outcomes. This workflow creates no schedule and no send.

## Reviewed publication

After explicit owner approval, set the edition and matching `data/news.yaml`
record to `reviewStatus: reviewed`. Copy any original Atlas JPEG into
`data/news-insights/figures/YYYY-MM-DD/`. The production postbuild runs
`scripts/publish-news-insights.ts`, validates sources, context routes, selected
News IDs and matching feed metadata, and renders only reviewed editions into
`dist/insights/YYYY-MM-DD/` before applying the shared article shell. This build
does not depend on ignored run ledgers or local review copies. Draft generation
still uses the frozen local run; a build never advances that checkpoint.

Reviewed readers omit draft banners, local review/template navigation and
`noindex` metadata. Source, cohort and missing-evidence limits remain. Editing a
review state does not authorize newsletter delivery. 
