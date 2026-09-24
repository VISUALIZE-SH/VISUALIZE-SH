# Local newsletter security review

Updated 2026-09-24 for local research, newsletter validation, and delivery
approval. The owner reviews the exact data and HTML before any publication or
Zoho send. The GitHub-hosted research and delivery workflows have been removed;
GitHub Actions still runs repository security checks and deploys approved site
changes to Pages.

## Trust boundaries and controls

### Private local research

- The active Sunday Codex task runs under the owner's ChatGPT account in the
  local project. It reads the ignored private watchlist at
  `artifacts/research/source-registry.yaml`. The watchlist stays out of GitHub
  and is a starting point, never evidence for a claim.
- External web content is evidence to check, never an instruction to execute.
  Research may update local data, but the task may not commit, push, deploy,
  create a Zoho campaign, or send mail.
- New news is marked `reviewStatus: draft`. New entities retain
  `curation.status: draft`; only Pulse may change on an existing curated entity
  during automated research. Every claim and source needs owner review.
- `npm run newsletter:review -- --date YYYY-MM-DD` runs the local validation gate
  and writes browser/email previews under ignored `artifacts/`. Both include a
  draft banner. Draft news is validated but omitted from public `graph.json` and
  normal `public/digests/` output.

### Public repository and site

- Only approved atlas data, source-linked news, generated digest HTML, code, and
  documentation belong in Git. `npm run security:check` scans tracked and
  unignored text for known credentials, email-shaped data, browser tracking,
  active digest content, and unpinned Actions. This heuristic scan cannot prove
  that every private detail is absent; review the complete diff.
- Schemas require public HTTPS source links and valid references. Generated HTML
  escapes news text and contains no scripts, forms, pixels, remote assets, or
  website tracking. GitHub Pages deploys only changes that reach `main`.
- Private credentials, subscriber data, the source watchlist, and draft review
  artifacts remain outside the public repository. The site links to a Zoho
  hosted consent form and does not embed it.

### Delivery

- `npm run newsletter:delivery:check -- --date YYYY-MM-DD` validates the local
  checkout and compares the deployed email HTML byte for byte with the local
  approved file. It prints a content hash and does not contact Zoho.
- Zoho Campaigns imports the verified public URL only after local approval.
  The owner checks the sender, topic, consented list, content, links, footer,
  unsubscribe behavior, and disabled tracking. A test-list delivery and actual
  receipt precede any production launch.
- The old Zoho OAuth grant and GitHub environment secrets are unused by this
  manual path. Remove or revoke them after a successful test and after checking
  that no other application depends on them.

## Residual risks

- AI research can be incomplete or wrong. Human source review is mandatory;
  the clinical disclaimer does not replace it.
- A public digest exposes whatever the owner approves and publishes. Exclude
  private notes, embargoed information, personal data, subscriber data, and
  confidential documents.
- The scheduled task needs the Mac and desktop app running, a working local
  checkout, network access, and available ChatGPT usage. If it fails, no issue is
  approved or sent automatically.
- A Zoho test or production send may be accepted before the UI confirms final
  delivery. Inspect campaign status and the recipient's actual inbox. Do not
  retry an uncertain send until checking Zoho for a duplicate.
- The legally required company address in Zoho's footer is public to recipients.
  Use an organizational mailing address suitable for disclosure.

## Approval gates

1. Review local data diffs, every source, and the draft browser/email previews.
2. Mark accepted news reviewed, remove rejected items, and rerun validation.
3. Approve the exact public HTML and repository diff before publication.
4. Compare deployed HTML with the approved local file.
5. Approve the exact issue and intended Zoho recipient list before launch.

`npm run validate:local` checks schemas, TypeScript, tests, the content scan,
and local preview preflight. It does not verify account settings, DNS, consent,
Zoho tracking policy, or actual message delivery. Check those in Zoho and record
the result of the test-list send.
