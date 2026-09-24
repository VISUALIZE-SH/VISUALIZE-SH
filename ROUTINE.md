# Legacy local Sunday news + dataset routine

> Cutover note: the GitHub-hosted replacement is documented in
> `docs/CLOUD_WORKFLOW.md`. After one successful end-to-end cloud test, disable the
> local scheduled task. Do not run both schedules: the cloud workflow updates
> `origin` through reviewed pull requests, while a local clone changes only when
> its owner explicitly pulls.

This is the durable prompt for the legacy local structural-heart newsletter task,
scheduled for Sundays at 6:00 PM Pacific. A single research pass should produce
both outputs:

1. update the app's source-linked news feed and Pulse values locally; and
2. send the human-readable weekly newsletter through the task's already-configured
   email/notification channel.

Do not create a second schedule. Keep the task attached to this local project so it
can edit the working tree; the machine and desktop app must be running at execution
time. The routine creates only **draft** clinical entities. It never commits,
pushes, or deploys.

## How the loop works

1. Read `schema/DATA_DICTIONARY.md`, the existing `data/*.yaml`, and the private
   ignored watchlist at `artifacts/research/source-registry.yaml`.
2. Research the preceding seven days once, then write selected stories to
   `data/news.yaml` and use the same material for the newsletter.
3. Refresh `pulse` and propose warranted additions/edits as `draft` entities with
   sources.
4. Run `npm run build:data` and fix every validation error.
5. Leave local, uncommitted changes plus a concise run summary, then send the digest
   using the existing recipient and delivery configuration.
6. The human curator reviews drafts in the app, corrects them, and promotes them to
   `curated` before any later deploy.

## Prompt for the local Sunday task

> Run the weekly VISUALIZE-SH structural-heart intelligence workflow. Work in
> `/Users/hparanjape/Documents/Work/Software/VISUALIZE-SH`. Do not commit, push,
> deploy, create another scheduled task, or change the configured newsletter
> recipient or delivery channel.
>
> 1. Read `schema/DATA_DICTIONARY.md` and follow it exactly, including the news
>    contract and the hard rules for automated updates.
>    Also use `artifacts/research/source-registry.yaml` as a systematic set of
>    starting points. It is a watchlist, not evidence: verify the exact dated
>    source for every selected claim, and keep the watchlist out of commits.
> 2. Review all current `data/*.yaml`. Note the newest `publishedAt` in
>    `data/news.yaml`; deduplicate against both canonical source URL and title.
> 3. Research material developments published during the preceding seven days in
>    structural heart (valvular and non-valvular), heart failure, and digital
>    therapies relevant to structural-heart care. Cover new FDA/CE approvals,
>    pivotal trial readouts, devices, drugs, digital therapies, acquisitions, and
>    meaningful status changes. Prioritize LAAO; septal/congenital closure; HCM;
>    ATTR-CM; HFrEF/HFpEF therapies; interatrial shunts; PA/IVC/LA sensors;
>    coronary-sinus/CMD therapies; TAVR including aortic regurgitation; mitral
>    TEER/TMVR/annuloplasty; tricuspid TEER/TTVR; transcatheter pulmonary valves;
>    and surgical valve therapy. Include university department news and
>    publication pages (e.g., Duke BME publications) and engineering journals
>    from the watchlist for device-engineering research.
> 4. Select only material, independently useful stories. Append each to
>    `data/news.yaml` using an immutable `news-YYYY-MM-DD-*` id, ISO publication
>    date, source-faithful title, one- or two-sentence summary, canonical public
>    HTTPS source URL, concise topic tags, and every relevant existing graph node
>    id. Prefer regulators, trial registries, journals, and original company
>    releases. Do not attach a story to a node merely because it is adjacent in the
>    graph. Keep the feed newest-first and retain at most 250 items.
> 5. Add or update warranted entities as `curation.status: draft`, with
>    `curation.lastUpdated` set to today and at least one credible source URL.
>    Create referenced companies and conditions before entities that point to them;
>    reuse existing category/subtype vocabulary and id prefixes.
> 6. Refresh `pulse` from 0–10 to reflect current, relative news attention across
>    the whole dataset. A quiet topic should drift down. Pulse is the only field
>    that may change on a curated entity without making it a draft.
> 7. Add links only when the exact URL is verified. For devices, prefer the maker's
>    product page, then a journal or credible clinical source. For trials, use a
>    non-ClinicalTrials.gov outcome summary. Never invent a URL; omission is safer.
> 8. Add timeline entries for new therapies and trials only when the date is
>    verified. Prefer the earliest FDA approval or CE mark for a therapy and the
>    ClinicalTrials.gov start date for a trial. Document availability-date
>    assumptions in `timeline.notes`; never guess.
> 9. Do not modify other facts on existing curated entities. If one looks outdated,
>    add a `curation.notes` review flag instead.
> 10. Run `npm run build:data` and fix every error. If validation cannot pass, do
>     not send the newsletter; report the failure for review.
> 11. Send the weekly newsletter through this task's existing email/notification
>     configuration. Reuse the same researched items, grouped into Structural
>     Heart, Heart Failure, and SH-relevant Digital Therapies. Include each title,
>     short summary, and source link. If a section has no material development, say
>     so rather than padding it. Do not add unsupported interpretation.
> 12. Finish with a concise run summary: every id added or changed, its source, any
>     curator review flags (especially regulatory status and NCT ids), and whether
>     newsletter delivery succeeded.
>
> Accuracy over completeness. When uncertain, omit optional fields rather than
> guessing.
