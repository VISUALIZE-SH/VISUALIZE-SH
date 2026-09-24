# Local Sunday news and newsletter review routine

This is the durable contract for the **Structural Heart Therapy Digest** scheduled
task. It runs Sundays at 6 PM Pacific in the saved local project, using the
owner's ChatGPT/Codex account. Keep the Mac powered on and the desktop app
running. The task prepares research and a newsletter for local review. It never
sends email, creates a Zoho campaign, commits, pushes, deploys, or publishes.

The private source watchlist stays in ignored
`artifacts/research/source-registry.yaml`. The scheduled task reads it locally;
neither an OpenAI API key nor a GitHub secret copy is needed. The watchlist is a
set of starting points, not evidence for a claim.

## Scheduled run

1. Read this file, `schema/DATA_DICTIONARY.md`, `schema/news.schema.json`, and the
   current `data/*.yaml`. Record any existing local edits; preserve them.
2. Research the preceding seven days once. Cover structural-heart devices,
   heart-failure therapies, and relevant digital therapies. Prioritize LAAO,
   septal/congenital closure, HCM, ATTR-CM, HFrEF/HFpEF, interatrial shunts,
   PA/IVC/LA sensors, coronary-sinus/CMD therapies, TAVR, mitral/tricuspid
   transcatheter therapies, pulmonary valves, and surgical valve therapy. Include
   meaningful engineering research from university and journal sources. Verify
   each exact publication date and canonical public HTTPS source. Prefer
   regulators, trial registries, journals, and original company releases.
3. Select at most 20 material, nonduplicative items. Add them to `data/news.yaml`
   with immutable `news-YYYY-MM-DD-*` IDs, source-faithful titles, concise
   summaries, topic tags, and relevant existing graph node IDs. Mark every new
   item `reviewStatus: draft`. Keep newest first and retain at most 250 items.
4. Add warranted entities only with `curation.status: draft` and verified source
   URLs. Pulse may change on existing curated entities; do not change their other
   facts. Flag uncertain regulatory status, trial IDs, and outdated facts for
   curator review. Never invent a link, date, or trial outcome.
5. Run `npm run newsletter:review -- --date YYYY-MM-DD`, using the Sunday issue
   date. This validates data, references, tests, TypeScript, and the public-repo
   safety scan, then writes local draft browser and email previews under ignored
   `artifacts/newsletter-review/YYYY-MM-DD/`. Fix validation errors. If a check
   cannot pass, report the failure and stop.
6. Report every changed ID and source, the local preview paths, item count,
   validation result, curator flags, and any limitations. Ask the owner to review
   the exact local data diff and previews. **Stop before publication or delivery.**

## After local approval

The owner reviews sources, data changes, and both previews. Accepted news items
are marked `reviewStatus: reviewed`; rejected items are removed. A separate
explicit local command renders the approved public issue, and publication to the
repository happens only after the owner's approval. After GitHub Pages serves the
exact HTML, a local delivery check compares it byte for byte. Zoho Campaigns is
then used manually to import and test the issue. Sending to the intended list
requires another explicit approval of that exact issue and recipient list. See
`docs/LOCAL_NEWSLETTER_WORKFLOW.md` for the full procedure.
