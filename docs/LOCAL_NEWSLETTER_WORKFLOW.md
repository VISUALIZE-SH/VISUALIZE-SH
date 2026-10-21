# Local weekly newsletter workflow

## Command summary

Run these from the repository root, replacing `YYYY-MM-DD` with the issue date.
Run the first command for the initial draft once the approved news has arrived via
engine export (step 1); rerun it after your edits.

```sh
# Validate the data and create local draft browser and email previews for review.
npm run newsletter:review -- --date YYYY-MM-DD

# After approving the content, validate again and render the public digest files.
npm run newsletter:render -- --date YYYY-MM-DD

# Ask Codex to commit the approved changes and push them to origin/main; Pages deploys.

# After deployment, verify the public email HTML matches the approved local file.
npm run newsletter:delivery:check -- --date YYYY-MM-DD
```

Newsletter generation, validation, and the delivery decision happen in the
owner's local project. Weekly research does not run here and nothing is scheduled:
the owner asks the private research engine for it, and the approved news arrives
as an export bundle. No OpenAI API key or private watchlist in GitHub is needed.

## 1. Approved news arrives via engine export

The owner runs the weekly news research in the private research engine, which
stops at a review packet for owner approval (see the engine's `docs/RUNBOOK.md`;
on the owner machine the engine is at `discovery-engine/`, ignored by Git). The
engine's `export-apply` step then writes the approved items into `data/news.yaml`,
with any justified Pulse/entity updates, in this checkout, uncommitted. Each item
carries the review state recorded in its bundle's PR notes. Then run:

```sh
npm run newsletter:review -- --date YYYY-MM-DD
```

The command validates data, references, tests, TypeScript, and the repository
safety scan before writing browser and email previews to ignored
`artifacts/newsletter-review/YYYY-MM-DD/`. The previews contain a prominent
**DRAFT REVIEW — DO NOT SEND** banner, and news still marked `reviewStatus: draft`
is excluded from the public `graph.json` feed and from normal digest rendering.
Neither the export nor this command sends Gmail or Zoho mail, creates a campaign,
commits, pushes, opens a PR, or deploys.

## 2. Approve the data and public issue locally

In Codex, inspect `git diff` for every changed data file and generated
`public/graph.json`, open both local previews, and check each claim against its
linked source. Remove rejected items and mark accepted news
`reviewStatus: reviewed` if it is not already. Review any proposed entity as a draft and keep private
notes, embargoed information, subscriber data, and credentials out of the public
files. Run `npm run newsletter:review -- --date YYYY-MM-DD` again after edits.

Only after the owner approves the exact local content, run:

```sh
npm run newsletter:render -- --date YYYY-MM-DD
```

The render command reruns the validation gate, writes sendable HTML to
`public/digests/YYYY-MM-DD/`, and updates the digest index. Inspect the final
HTML and the whole diff, then ask Codex to commit the approved changes and push
them to `origin/main`. A PR is optional if the repository permits direct pushes.
GitHub Pages hosts the public site; its deployment workflow runs when approved
changes reach `main`. The export step never performs these publication steps.

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
