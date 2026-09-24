# Local newsletter readiness

The local command produces two review previews from `data/intelligence/pilot.yaml` and `data/editorial-issues.yaml`:

```bash
node --import tsx scripts/newsletter-local.ts
```

When `public/intelligence.json` exists, the command consumes that compiled
payload; otherwise it validates the YAML directly. Refresh the compiled payload
first with `node --import tsx scripts/build-intelligence.ts` when needed.

The files are written to `public/previews/newsletter/<slug>/index.html` and
`email.html`, with an archive manifest at `public/previews/newsletter/index.json`.
This directory is ignored by Git. `npm run build` also removes previews from its
output before deployment. Generate them locally when needed; do not force-add
them to a public commit.
Both flagship issues are explicitly marked **DRAFT REVIEW — FOR LOCAL REVIEW
ONLY; DO NOT SEND**. Their change, why-it-matters, uncertainty, claims, readouts,
outcomes, and source links come only from compiled intelligence records. A missing
or unreviewed record keeps the preview in draft state; the script does not turn an
editorial title into a clinical assertion.

The normal weekly renderer continues to write `public/digests/YYYY-MM-DD/` and
excludes records explicitly marked `reviewStatus: draft`. Preview links use stable
Atlas/Data query deep links (`/?mode=atlas&version=...` and
`/?mode=data&version=...`) and explicit static preview paths at
`/previews/newsletter/<slug>/index.html`. The local client signup
configuration is `VITE_NEWSLETTER_SIGNUP_URL`; the deploy workflow maps the public
repository variable `NEWSLETTER_SIGNUP_URL` into that Vite variable. Preview HTML contains no
scripts, forms, pixels, trackers, cookies, external assets, or web-font requests.

Run the no-write, no-network preflight with:

```bash
node --import tsx scripts/newsletter-local.ts --dry-run
```

Preflight reports only configuration names and statuses. It never prints values,
refreshes a token, calls Zoho, creates a draft, or sends a campaign. The local
command refuses `--draft` and `--send`; the existing Zoho command also defaults to
dry-run and requires explicit flags for either remote operation.

For a project-page deployment, pass its base path so archive and workspace links
remain valid:

```bash
node --import tsx scripts/newsletter-local.ts --base /visualize-sh/
```

The remaining manual rollout dependencies are account and domain operations:

- Create the Zoho Campaigns organization, public company details, verified sender,
  consent-controlled list/topic, hosted HTTPS signup form, and double opt-in.
- Publish and verify SPF and DKIM and maintain DMARC for the sending domain.
- Disable open, click, plain-text, reply, Google Analytics, and website-activity
  tracking in Zoho Campaigns.
- Set the deployed HTTPS origin, hosted signup URL, matching Zoho data-center
  endpoints, least-privilege environment secrets, and protected `zoho-production`
  approval as described in `docs/ZOHO_CAMPAIGNS_SETUP.md` and
  `docs/CLOUD_WORKFLOW.md`.
- Review a test-list import and the required Zoho footer before enabling any
  protected delivery. This local work does not modify Zoho, subscribe anyone, or
  enable a schedule.

Do not put credentials, refresh tokens, subscriber addresses, or sender details in
the repository or generated preview files.
