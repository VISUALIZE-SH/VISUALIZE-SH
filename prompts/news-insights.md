# Manual News Insights generation template

Use this template when the owner asks to generate a **News Insights** edition.
It is a repository workflow template, not a scheduled task or a personal artifact
template skill. Read `docs/NEWS_INSIGHTS_WORKFLOW.md` and
`docs/SOURCE_CURATION_POLICY.md` before starting. Evidence research is not done
here; it arrives as the engine's evidence packet (below).

## Purpose and voice

Answer **what changed our understanding of structural heart, why that change
matters, and what evidence would change the interpretation next**. Use Format A
as the shell, borrow Format B when a credible connection emerges, and close with
Format C. Produce one dynamic edition, not a catalogue of headlines or a fixed
specialty topic. Deeper histories and specialty research belong in Editorial.

Write for device R&D, engineering, simulation, and clinical-development readers,
with explanations accessible to clinicians. Make an argument that readers can
inspect. Explain mechanisms, patient/anatomy fit, evidence, and evolution when
they matter; do not force all four into every edition. Use an academic, objective
tone with short sentences, exact identities, and restrained conclusions. Prefer descriptive headings and direct statements. Avoid
reveal language, suspense, promotional claims, reader-addressed exhortations,
and lengthy contrast constructions such as “X, rather than Y.” Do not present
an editorial analogy as a scientific relationship or clinical guidance.

## Run inputs and coverage

- **Run date:** today's calendar date in America/Los_Angeles, or the owner's
  explicit historical run date.
- **Boundary:** the last successfully completed manual News Insights run through
  this run date. Both dates are inclusive; previously seen unchanged records are
  suppressed using the local run ledger. A new record on the previous boundary
  date remains eligible. A changed record is a verification candidate, not proof
  that its underlying document changed.
- **First run:** obtain or use the owner's explicit starting window. For the
  inaugural October 13, 2026 edition, use September 30–October 13.
- **Cadence:** normally about two weeks; in a quiet period the owner may wait
  about a month. The actual run dates control coverage, not a fixed 14/30-day
  lookback. Do not create a schedule or silently advance a deferred run.
- **Rerun:** revise the same date's frozen run rather than creating duplicate
  coverage or moving the next boundary.
- **Older backfill:** keep newly found publications before the boundary separate
  from in-window developments. Use them as dated context or an explicitly
  labeled supplement; never change their dates to make them current news.

Run `npm run news-insights:prepare -- --date YYYY-MM-DD`. With no completed local
history, add `--from YYYY-MM-DD`. Inspect the saved `run.json`, candidates, draft
states, and backfill IDs. Exclude existing News Insights/Editorial records from
the input so the feature cannot analyze itself. Public payloads exclude draft
News; use authored YAML for this local step. The saved window and candidate IDs
are the inputs to the evidence run below.

## Evidence packet from the research engine

Extraction and connection research do not run in this repository. Use the private
research engine's News Insights evidence packet (run type `news-insights-evidence`),
which the owner requests for the saved window and candidate IDs. On the owner
machine the engine is at `discovery-engine/`, ignored by this repository's Git;
follow its `AGENTS.md` and `docs/RUNBOOK.md`. Elsewhere, stop and ask the owner.
The packet holds the source events, an extraction table with exact identities and
locators, context routes, zero to three connection candidates with counterarguments,
next checks, and exclusions and rights, in
`discovery-engine/runs/<date>-news-insights-evidence/evidence-packet.md`. It is
input to drafting, never a source or an owner approval.

1. The coordinating agent reads the packet and checks the material assertions it
   will use against the cited documents. Draft only claims the packet supports with
   a locator; keep sponsor claims attributed and unknowns explicit. A claim the
   packet does not support, or a missing or stale packet, becomes an open question
   rather than a sentence.
2. After a concrete draft exists, run a separate critique pass with a different
   agent (`gpt-6.1-sol`, high effort for material evidence, generation, or cohort
   risks). Ask for the strongest counterargument and for unsupported or
   over-generalized statements. If a specified model is unavailable, disclose a
   suitable substitution.
3. The coordinator resolves differences, integrates once, and records what changed
   after critique. Agent output is neither a source nor owner approval.

Keep shared YAML and any Linear mutations with the coordinator. Use at most two
subagents. Recordings, interviews, podcasts, and transcripts are not evidence. An
announcement establishes only its attributed announcement scope when result
documents are missing.

## Selection and argument tests

Choose the number of insight sections the window warrants, usually two or three.
Do not rank by publicity volume, graph degree, numerical quality scores, or a
quota of therapeutic areas. A meaningful connection may span unrelated graph
nodes, but shared tags alone never establish it.

For each candidate argument, write:

- **Change:** what the inspected document establishes and how it differs from
  the earlier documented context.
- **Consequence:** what the reader should understand differently, and why.
- **Counterargument:** the strongest competing reading or limit.
- **Connection (optional):** the common constraint/dependency/contrast, supporting
  documents, and the point where it ceases to apply.
- **Next check:** the particular observation/document that would distinguish
  interpretations; “more data are needed” is insufficient.

Reject a section that could be replaced by an existing News summary without
losing reasoning. Reject a common-theme claim that relies on simultaneous
publication. Preserve disagreements and missingness. A quiet run may yield a
shorter edition; a fragmented run may contain independent arguments; a dominant
event may deserve most of the space. If no defensible insight exists, record a
local deferred attempt and keep the last completed boundary, so the next manual
run still covers the gap.

## Article shell

Use the structured source of truth in `data/news-insights/YYYY-MM-DD.yaml` with
the contract in `schema/news-insights.schema.json`.

1. **Identity:** `News Insights | [actual coverage dates]`, an issue-specific dek,
   run date and coverage window, `contentType: news-insights`, draft status.
2. **Opening analysis:** about 40–70 words explaining the selected changes and
   their significance. State the coverage and evidentiary scope.
3. **Insight sections:** documented change → consequence → counterargument or
   boundary → source/evidence route. Include Format B within a section or as its
   own section only when earned by the documents.
4. **Visual reasoning:** one or two original figures/tables if they convey the
   argument better than prose. Use brand purple, clear typography, readable
   labels and captions, responsive layout, and accessible textual equivalents.
   Label interpretations. Do not compare unlike clinical endpoints on one axis
   or imply a causal pipeline from merely related events. No source figure reuse
   without verified license/attribution/version/crop provenance.
5. **Evidence priorities for the next edition:** Close with Format C: specific evidence
   needed, exact claim/population/version at issue, and how the answer matters.
6. **Evidence routes and scope:** citations near each material assertion; links
   to exact Atlas/Data context where supported; selected and unselected News IDs;
   provenance and access limits in `review.md`. Do not map a study to an
   unverified product generation or treat current Data filters as historical
   database snapshots. Add `contextLinks` beside the paragraph/table row making
   a connection. Use `{label, versionId}` for an existing exact-version Data
   route, or `{label, nodeId}` for Atlas context. Verify every ID; label broad
   lineage/condition context explicitly when the paper has no structured Data
   record. Current draft catalog entries are navigation, not independent proof.
   An optional `atlasSnapshot: {file, nodeId, conditionId?, caption}` uses a local JPEG under
   the run’s `figures/` directory. Capture the actual Atlas with the node and
   existing neighborhood highlighted; describe displayed relationships and
   limitations. Do not draw unsupported edges to illustrate an analogy.

Aim for roughly 450–650 prose words, excluding the table, captions, and source
appendix. Use less space in a quiet window. Length and section count remain
flexible when evidence requires additional context. Read the article aloud conceptually: the argument should
remain coherent without the table and should add something beyond all the
individual headlines. Avoid hype, a list of generic caveats, and manufactured
clinical conclusions.

## Completion and local review

- Validate the article against its schema, saved coverage/candidate IDs, source
  references, graph node/version pointers, and source policy.
- Run `npm run news-insights:render -- --date YYYY-MM-DD` to create ignored local
  Markdown and browser previews. A successful render checkpoints this manual
  run; failure/prepare/defer does not. Checkpoint means generation complete,
  not factual approval, publication, or delivery.
- Assemble `review.md` with source-to-claim locators, the evidence packet
  reference, critique results, exclusions, rights, and open questions. Record the
  actual model work, not promised work.
- Review desktop/mobile layout, tables, figure labels, citations, evidence
  routes, and the existing **News Insights** metadata keyword highlighted with
  brand-purple background and bold white text. **Editorial** uses the same
  treatment. Render the keyword once; do not add a separate duplicate pill.
  Ordinary News retains its existing keyword styling. Local demo fixtures must be
  identified as previews, not silently added to public content.
- Preserve owner changes. Run focused tests plus `npm run validate:local` and
  `VITE_BASE=/ npm run build` when app/data contracts change. Documentation-only
  runs need content/link review and `git diff --check`.
- Keep the results local until the applicable owner/factual review. Do not
  create a sendable digest, schedule, publish, or send. Track separate outcomes
  in the proper existing Linear projects when external work is authorized; keep
  a pending local proposal while the owner requires local-only work.

## How to invoke again

“Generate the next News Insights locally using `prompts/news-insights.md`, from
the last completed manual run through today. Use Format A, credible Format B
connections, and a Format C close; use the engine's evidence packet and show me
the draft and review.md.”
