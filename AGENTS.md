# VISUALIZE-SH contributor rules

Read `docs/HANDOFF.md` for the implementation map, `docs/LINEAR_WORKFLOW.md`
for issue discipline, and `docs/SOURCE_CURATION_POLICY.md` before data edits.
Inspect `git status --short` and preserve existing owner changes.

## Research and factual data intake

Research is not done in this repository. Factual data changes arrive as reviewed
export bundles from the owner's private research engine. On the owner machine the
engine is checked out at `discovery-engine/` (ignored by this repository's Git).
For a research request there, follow its `AGENTS.md` and `docs/RUNBOOK.md`. On any
other machine, stop and ask the owner. Do not gather evidence, snapshot sources,
or draft factual records here. The engine writes approved records into this
checkout uncommitted; validate, preview, and publish them under the rules below.

## Track the work in Linear

Use workspace `workspace-visualize-sh`, team `Workspace-visualize-sh` (`WOR`).
Resolve existing projects by ID; do not create similarly named replacements:

- `P-WOR-1` / `visualize-sh-webapp`: News, Atlas, Data, retained graph,
  software, schemas, evidence catalog, and publication of reviewed data.
- `P-WOR-2` / `visualize-sh-newsletter`: recurring aggregated digest selection,
  rendering, signup, delivery, and operational cadence.
- `P-WOR-3` / `visualize-sh-editorials`: owner-authored specialty articles,
  editorials, research articles, and topical histories, including LAAO/LAAC.
- `P-WOR-4` / `visualize-sh-discovery-engine`: research and discovery issues
  and the private engine itself.

Search existing issues before creating one. Reuse an issue with the same intended
outcome. Give substantive work an issue with scope, repository/source pointers,
acceptance criteria, priority, relevant labels, and dependencies. Split an effort
when it produces independently reviewable deliverables in different projects;
link them instead of duplicating the task. Newsletter distribution does not
change an article's project. Use `codex/wor-<number>-<short-slug>` for new branches
and include the issue ID in PR descriptions.

Move an issue to In Progress when work starts; record validation and remaining
limits when handing it off. Mark Done only when its acceptance criteria are met.
Account setup, factual signoff, publication, and delivery are separate outcomes.
If Linear is unavailable, record a pending issue in `docs/LINEAR_WORKFLOW.md`
and reconcile it when access returns; do not claim it was filed.

## Publication acceptance

A factual record merges only if it meets the acceptance criteria in
`docs/SOURCE_CURATION_POLICY.md`: eligible documentary source, exact locator and
scope, review state, and figure/reuse rights. Podcasts, interviews, recordings,
and their transcripts are never factual evidence. Keep unknown values explicit;
never transfer a fact across product generations, cohorts, jurisdictions, or
indications without supporting evidence. New factual records remain draft until
the applicable curator/author review is complete.

## Delegation

For a substantial task with independent bounded work, delegate suitable parts to
subagents under these rules. For a small edit, one agent is usually more
efficient. Do not spawn agents merely to fill available slots or repeat completed
work.

- Use `gpt-6-luna` for narrow inventories, duplicate checks, and mechanical edits
  with explicit criteria. Use low effort for simple mechanics; medium or high only
  when verification demands it. Escalate after one failed or ambiguous pass rather
  than repeatedly retrying the same prompt.
- Use `gpt-6.1-sol` for schema/design decisions, implementation, integration, and
  review. Start at medium effort; use high for difficult correctness risks. Use an
  available Sol model if that ID is absent and disclose the substitution. Do not
  assume model availability or prices.
- Give each agent one deliverable, specific files/record IDs, acceptance criteria,
  and a concise output format: findings, exact paths, uncertainties, changes, and
  checks. Prefer a fresh context with those inputs over copying the full
  conversation.
- Use at most two subagents by default and stay within runtime limits. Assign
  disjoint files for writes; keep shared YAML and Linear mutations with the
  coordinating agent. Prefer read-only findings for review.
- The coordinating agent verifies material claims, integrates once, runs the
  appropriate checks, and updates Linear. A model's output is not a source or
  human approval. Reuse results; return summaries rather than logs.

These are project routing defaults, based on [official subagent guidance](https://learn.chatgpt.com/docs/agent-configuration/subagents),
checked 2026-10-04. Recheck available IDs when the runtime changes. Token savings
are an objective, not a guarantee; delegation adds coordination and context cost.

## Change and review gates

For a manual News Insights request, read `prompts/news-insights.md` and
`docs/NEWS_INSIGHTS_WORKFLOW.md`. Use the last completed local generation run
through today's Los Angeles date; initial windows are explicit. Keep this
analytical feature separate from specialty Editorial articles. The evidence
packet comes from the engine (run type `news-insights-evidence`). Render/checkpoint
local drafts only; this creates no schedule, publication, or send.

Edit authored YAML, schemas, validators, and types together where applicable;
regenerate public payloads from YAML. Use focused checks for the change, and
`npm run validate:local` plus `VITE_BASE=/ npm run build` for substantial app/data
changes. Documentation-only changes need link/content review and
`git diff --check`, not the full software suite.

Keep credentials, subscribers, private watchlists, licensed full text, and raw
evidence out of Git/public outputs. Follow `docs/LOCAL_NEWSLETTER_WORKFLOW.md`
for exact content/recipient approval before publication or delivery. Creating a
Linear issue or completing local software checks does not authorize a send.
