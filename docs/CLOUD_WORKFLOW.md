# Cloud newsletter workflow

The cloud process is split at the human-review boundary:

1. Sunday research prepares a pull request containing source-linked news, new
   entities as drafts, Pulse changes, compiled graph data, and public/email HTML.
2. A curator reviews and merges that pull request.
3. A protected delivery workflow verifies the merged PR and the exact GitHub Pages
   deployment, then asks Zoho Campaigns to send the approved HTML.

Nothing in this workflow pulls, writes, or otherwise updates a local clone. Local
copies change only when their owner deliberately pulls from `origin`.

## Sunday research and review

`.github/workflows/newsletter-research.yml` runs at both possible UTC equivalents
of Sunday 6 PM in `America/Los_Angeles`; a timezone gate admits only the correct
run across daylight-saving changes. Scheduled execution remains off until the
repository variable `NEWSLETTER_AUTOMATION_ENABLED` is exactly `true`. Manual
dispatch is available for setup testing while the schedule is off.

The job checks out trusted `main`, then:

1. calls the OpenAI Responses API with live web search and `store: false`;
2. validates the bounded JSON research proposal and its HTTPS sources;
3. adds news, draft-only new entities, and Pulse changes while retaining proposed
   edits to curated facts in `data/research-proposals/` for human review;
4. renders `public/digests/YYYY-MM-DD/index.html` and email-safe `email.html`;
5. validates schemas, references, tests, TypeScript, and the secret/PII/tracking
   scan; and
6. pushes only the expected data and generated public files to a new
   `codex/newsletter-*` branch, opens a PR, and explicitly dispatches the security
   workflow on that PR branch. This explicit dispatch is needed because GitHub
   intentionally suppresses most follow-on events created with `GITHUB_TOKEN`.

Untrusted web content is evidence, never workflow instruction. It cannot edit
workflow or application code, and no research output is sent until the reviewed PR
is merged and a separate delivery approval is granted.

## Protected delivery

`.github/workflows/newsletter-delivery.yml` is manual by design. Dispatch it from
`main` with the merged PR number, issue date, and the confirmation word `SEND`.
The `zoho-production` environment should require a reviewer. The job verifies that:

- the supplied PR is merged into `main` and contains that issue's email HTML;
- GitHub Pages successfully deployed the exact current `main` commit;
- the public HTTPS email URL is reachable; and
- all repository safety and newsletter validation checks still pass.

Only then does it exchange the Zoho refresh token for a short-lived access token,
create the campaign from the public HTML, and request delivery to the Zoho-managed
list. Subscriber addresses never enter GitHub.

## GitHub configuration

Repository secret:

- `OPENAI_API_KEY` — a project-scoped key with a spending limit suitable for one
  weekly research run.
- `NEWS_SOURCE_REGISTRY_YAML` — the complete private YAML source watchlist. Keep
  the corresponding local copy at ignored
  `artifacts/research/source-registry.yaml`; never commit either copy. The job
  validates the watchlist shape and passes only its names, roles, coverage notes,
  and public HTTPS URLs into the bounded research prompt.

The research command requires a source watchlist for a real API run. A local
`--dry-run` may omit it when checking dates and configuration; when present, the
ignored local watchlist is still parsed and summarized by category/count only.

`zoho-production` environment secrets:

- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_CAMPAIGNS_FROM_EMAIL`
- `ZOHO_CAMPAIGNS_LIST_KEY`
- `ZOHO_CAMPAIGNS_TOPIC_ID` — optional for accounts that do not require a topic.

Repository variables (public configuration, not credentials):

- `NEWSLETTER_AUTOMATION_ENABLED` — leave unset until rollout is complete; then
  set to `true`.
- `NEWSLETTER_PUBLIC_ORIGIN` — deployed site origin, with no trailing path.
- `NEWSLETTER_SIGNUP_URL` — published Zoho hosted signup-form URL.
- `ZOHO_ACCOUNTS_URL` — the account's Zoho data-center token origin.
- `ZOHO_CAMPAIGNS_API_URL` — the matching Campaigns API base ending in
  `/api/v1.1`.
- `OPENAI_RESEARCH_MODEL` — optional; defaults to `gpt-5.5`.
- `OPENAI_RESEARCH_EFFORT` — optional `low`, `medium`, or `high`; defaults to
  `low` to control cost.

Configure a `main` ruleset to require a pull request and passing security checks,
and to block force pushes and deletion. With a single GitHub account, use zero
required PR approvals: GitHub cannot count the PR author's own approval. The owner
must still inspect the diff, source links, and checks before merging. Add required
CODEOWNERS review only after a second trusted reviewer has access. Configure
`zoho-production` with the owner as a required reviewer, disable self-review and
admin bypass, and allow deployments only from `main`.

Under **Settings → Actions → General → Workflow permissions**, the organization
must permit the built-in Actions token to write and allow Actions to create pull
requests for automated research PRs to work. If either control is disabled by
organization policy, leave `NEWSLETTER_AUTOMATION_ENABLED` unset and ask an
organization owner to enable the minimum repository permissions needed. Do not
substitute a broad personal access token. The workflow never approves its own PR.
Enable GitHub secret scanning with push protection and private vulnerability
reporting. Action references are pinned to immutable commit SHAs and Dependabot
proposes updates.

## Rollout and failure recovery

1. Complete `docs/ZOHO_CAMPAIGNS_SETUP.md` and GitHub configuration.
2. Keep `NEWSLETTER_AUTOMATION_ENABLED` unset.
3. Manually run research for a chosen Sunday date and review the resulting PR.
4. Merge it, wait for Pages, and run delivery first against a Zoho test list.
5. Confirm the campaign body, links, consent, unsubscribe footer, sender identity,
   and audit trail.
6. Move to the production list and set `NEWSLETTER_AUTOMATION_ENABLED=true`.
7. Disable the legacy local Sunday task only after this end-to-end check succeeds.

If research or validation fails, no PR is opened. Re-run after correcting the
configuration; do not bypass validation. If delivery fails, Zoho credentials or
the source data are unchanged in GitHub, so correct the configuration and
re-dispatch. Before retrying a send, inspect Zoho Campaigns to ensure the prior
attempt did not already create or send a campaign.
