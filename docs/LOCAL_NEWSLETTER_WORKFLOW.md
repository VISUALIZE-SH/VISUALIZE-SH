# Local weekly newsletter workflow

Research, newsletter generation, validation, and the delivery decision happen in
the owner's local Codex project. The active **Structural Heart Therapy Digest**
task runs Sundays at 6 PM Pacific under the owner's ChatGPT account. The Mac and
desktop app must be running, and the local checkout and ignored source watchlist
must remain available. No OpenAI API key or private watchlist in GitHub is needed.

## 1. Scheduled research stops at a draft

The task follows `ROUTINE.md`. It researches the preceding seven days, updates
`data/news.yaml` and justified Pulse/entity drafts, and marks new news
`reviewStatus: draft`. It then runs:

```sh
npm run newsletter:review -- --date YYYY-MM-DD
```

The command validates data, references, tests, TypeScript, and the repository
safety scan before writing browser and email previews to ignored
`artifacts/newsletter-review/YYYY-MM-DD/`. The previews contain a prominent
**DRAFT REVIEW — DO NOT SEND** banner. Draft news is excluded from the public
`graph.json` feed and from normal digest rendering. The task reports its changes
and stops. It never sends Gmail or Zoho mail, creates a campaign, commits,
pushes, opens a PR, or deploys.

## 2. Approve the data and public issue locally

In Codex, inspect `git diff` for every changed data file and generated
`public/graph.json`, open both local previews, and check each claim against its
linked source. Remove rejected items and mark accepted news
`reviewStatus: reviewed`. Review any proposed entity as a draft and keep private
notes, embargoed information, subscriber data, and credentials out of the public
files. Run `npm run newsletter:review -- --date YYYY-MM-DD` again after edits.

Only after the owner approves the exact local content, run:

```sh
npm run newsletter:render -- --date YYYY-MM-DD
```

The render command reruns the validation gate, writes sendable HTML to
`public/digests/YYYY-MM-DD/`, and updates the digest
index. Inspect the final HTML and the whole diff, then commit and publish the
approved changes through the normal repository review path. GitHub Pages still
hosts the public site; its deployment workflow runs when approved changes reach
`main`. The scheduled task never performs these publication steps.

## 3. Check deployment, then approve delivery locally

Once Pages has deployed the approved revision, run:

```sh
npm run newsletter:delivery:check -- --date YYYY-MM-DD
```

This local command reruns validation and compares the public HTTPS
`/digests/YYYY-MM-DD/email.html` **byte for byte** with the approved local file.
It prints a SHA-256 digest for the delivery review and does not contact Zoho.
If it fails, do not import or send; investigate the deployment or changed file.

In Zoho Campaigns, create a regular email campaign and use **Import HTML from
URL** with the verified public email URL. Choose the intended sender, topic, and
consented list. Review Zoho's imported content, plain-text fallback, every link,
disclaimer, company footer, unsubscribe handling, and tracking settings. Send
first to a test list and inspect the actual received message. For production,
the owner must explicitly approve the exact issue and recipient list locally
before pressing **Launch** in Zoho. Zoho's current [campaign creation
guide](https://help.zoho.com/portal/en/kb/campaigns-3-0/user-guide/email-campaigns/articles/v3-create-an-email-campaign-in-zoho-campaigns)
documents Import HTML from a URL, test sends, and launch.

Before retrying any uncertain send, inspect Zoho's campaign status and audit
trail to avoid duplicate delivery. A local validation result does not establish
subscriber consent, sender authentication, or that Zoho has disabled tracking.

## GitHub configuration after the switch

The GitHub research and delivery workflows are removed. The existing Pages and
security workflows remain. Leave `NEWSLETTER_AUTOMATION_ENABLED` unset or remove
it. `OPENAI_API_KEY` and `NEWS_SOURCE_REGISTRY_YAML` repository secrets are no
longer needed. The existing Zoho environment secrets are also unused by this
manual delivery path. After a successful test-list send, remove unused secrets
and the `zoho-production` environment from GitHub if there is no other consumer.
Keep the long-lived Zoho credentials in the owner's password manager until they
are revoked or rotated. Do not copy them into this repository or chat.
