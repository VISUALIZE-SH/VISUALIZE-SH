# Cloud newsletter security review

Code review: 2026-09-19 · Handoff clarification: 2026-09-23

## Outcome

The code includes controls for public-repository research and delivery. This
checkout does not establish that GitHub rulesets, the `zoho-production`
environment's required reviewers, Zoho settings, or domain records are
configured. Those are rollout checks below. Scheduled research is disabled by
default; the delivery workflow is manual and restricted to `main`. Its environment
approval takes effect only when required reviewers are configured in GitHub.
GitHub needs a Zoho list key, not subscriber addresses or exports.

## Trust boundaries and controls

### Public repository

- Only public atlas data, source-linked news, generated newsletter HTML, code, and
  documentation belong in Git.
- `npm run security:check` scans tracked and unignored text for known credential
  patterns and email-shaped values. It also checks browser code and digest HTML
  for selected tracking and active-content patterns. This heuristic scan cannot
  prove that every secret or private fact has been excluded; review the diff.
- Data schemas and the compiler require public HTTPS links without embedded
  credentials. Generated HTML escapes untrusted text.
- Dependency audit, dependency review, and CodeQL run in GitHub Actions. Actions
  are pinned to immutable commit SHAs and Dependabot proposes updates.

### AI-assisted research

- The OpenAI key is available only to the single research step. Requests use
  `store: false`, a bounded evidence window, bounded output/tool calls, and live web
  search.
- Web content is explicitly untrusted. The model returns structured proposals; it
  cannot select repository paths or run commands.
- New entities are draft-only. Existing curated facts are recorded as proposals,
  not overwritten. Only Pulse may change automatically on an existing node.
- A schema/reference/URL/security gate must pass before the workflow can open a
  pull request. No proposed content is delivered before human review and merge.

### GitHub automation

- Workflows start with no permissions and grant only job-level access. Checkout
  does not persist credentials.
- Research can stage only `data`, `public/graph.json`, and `public/digests`.
- After the built-in token opens the research PR, the job explicitly dispatches
  security checks on the new branch; it does not rely on a downstream PR event
  that GitHub may suppress for recursion prevention.
- Production delivery accepts only an exact `SEND` confirmation from `main`, then
  verifies the PR was merged, the current email HTML has the reviewed Git blob,
  the exact current main revision deployed successfully, and the deployed HTML is
  byte-for-byte identical to the local reviewed file.
- Zoho API hosts are allowlisted as matching official data-center pairs. Repository
  variables therefore cannot redirect OAuth credentials or access tokens to an
  arbitrary host.

### Subscriber and mail data

- Contacts stay in a consent-controlled Zoho list. GitHub receives only a list key
  and optional topic ID, both stored as protected environment secrets.
- The website links to a Zoho-hosted form instead of embedding it. App code sets
  no cookies; its only persistent browser value is the `localStorage` color-theme
  preference. `PRIVACY.md` documents this and the external services involved.
- Double opt-in, unsubscribe/suppression handling, sender-domain authentication,
  and organization-wide disabling of open/click/reply/analytics tracking are part
  of the required Zoho setup.
- The public email body contains no scripts, forms, remote assets, or tracking
  pixels. Zoho must be checked during the test send to ensure it does not add
  tracking and does add the required organization/unsubscribe footer.

## Residual risks

- AI research can be incomplete or wrong. Human source review remains mandatory;
  the clinical disclaimer does not replace that review.
- Any public digest can disclose whatever a curator merges. Never include private
  notes, embargoed material, personal data, subscriber data, or confidential
  documents.
- A compromised Zoho administrator or GitHub repository administrator can change
  mailing configuration. Require MFA, minimize administrators, review audit logs,
  and rotate credentials after role or security changes.
- Zoho's create-then-send API has no repository-level idempotency guarantee. If a
  run fails after campaign creation or during send, inspect Zoho before retrying to
  avoid duplicate delivery.
- A successful send API response means Zoho accepted the request; inspect the
  campaign status and test-list receipt before treating delivery as complete.
- The web app loads Google Fonts and the site host processes ordinary request logs.
  VISUALIZE-SH does not receive analytics from either, but this is disclosed in the
  public privacy notice.
- The legally required organization address in Zoho's footer is public to
  recipients. Use an appropriate organizational mailing address, not an address
  that should remain private.

## What the checkout can and cannot verify

`npm run validate:local` checks schemas, TypeScript, tests, the local content
scan, and a no-network configuration preflight. `npm run build` verifies the
static bundle. Neither command reads GitHub settings, DNS, subscriber consent,
Zoho organization policy, or the delivered message. Record those external checks
in the rollout review; do not infer them from a green local build.

## Rollout gate

Before setting `NEWSLETTER_AUTOMATION_ENABLED=true` or delivering to the production
list:

1. Enable GitHub secret scanning, push protection, private vulnerability reporting,
   a `main` ruleset requiring PRs and status checks, and deletion/force-push
   blocking. For a solo owner, use zero required PR approvals and personally review
   every diff and source before merge. Require CODEOWNERS approval once an
   independent trusted reviewer is available; requiring it for the sole PR author
   would deadlock merges.
2. Have an organization owner permit the built-in Actions token to write and create
   pull requests before enabling scheduled research. If organization policy keeps
   either permission disabled, leave the schedule off. Do not use a broad personal
   access token as a workaround; the workflow must never approve its own PR.
3. Restrict the `zoho-production` environment to `main` and require a reviewer.
4. Enter every secret directly in GitHub's settings UI; never paste it into chat,
   an issue, a PR, a command argument, or a repository file.
5. Complete the Zoho setup in `docs/ZOHO_CAMPAIGNS_SETUP.md`, including MFA,
   SPF/DKIM/DMARC, double opt-in, public footer identity, and disabled tracking.
6. Run research manually, review and merge the PR, then perform the first delivery
   to a test list. Inspect source links, rendering, disclaimer, unsubscribe footer,
   headers, and the Zoho audit log.
7. Enable the cloud Sunday schedule and only then disable the legacy local task.
