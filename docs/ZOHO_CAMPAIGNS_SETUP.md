# Zoho Campaigns setup

The repository generates a static, email-safe HTML issue. Zoho Campaigns imports
that **public HTTPS HTML as the campaign body**; subscribers receive a normal HTML
email, not merely a link to a web page.

This is the account and domain setup runbook. The repository's research, PR, and
delivery sequence is in `docs/CLOUD_WORKFLOW.md`; the code-level trust boundaries
and remaining checks are in `docs/SECURITY_REVIEW.md`. None of the account steps
can be confirmed from a local build.

Never put credentials, grant codes, refresh/access tokens, subscriber exports,
sender addresses, recipient addresses, or contact lists in this repository, a
pull request, an issue, a workflow variable, or chat. Enter secret values directly
in GitHub's secret-setting UI.

## 1. Configure Campaigns

Before adding contacts or credentials, enable MFA on the administrator account and
store recovery codes outside the repository.

1. Create or select the Zoho Campaigns organization in the correct Zoho data
   center. Check the hostname of the Campaigns web app; the Accounts and Campaigns
   API hostnames must use the [matching data-center domain](https://www.zoho.com/campaigns/help/developers/data-centers.html).
2. Open **Settings → General → Company Details**. Enter the public organization
   identity, website, mailing address, and
   `https://visualize-sh.com/privacy.html`. Zoho places this information in the
   campaign footer, so do not use a private address that should not be disclosed.
   See Zoho's [company-details guidance](https://help.zoho.com/portal/en/kb/campaigns/user-guide/settings/general/articles/how-to-manage-company-details).
3. Open **Settings → Deliverability → Manage Senders**, add the intended sender,
   and complete mailbox verification. Then open **Domain Authentication**, copy
   Zoho's SPF and DKIM records into the domain's DNS, and verify them in Zoho.
   Follow Zoho's [domain-authentication steps](https://help.zoho.com/portal/en/kb/campaigns/user-guide/settings/domain-authentication/articles/authenticate-my-domain).
   Maintain a DMARC policy for the sending domain as a separate domain-security
   control.
4. Open **Settings → Campaign Policy → Campaign Tracking** and choose **Do not
   track** for email opens. Disable click/URL, plain-text, reply, Google Analytics,
   and website-activity tracking as well. This prevents Zoho from adding a tracking
   pixel or rewriting source links; Zoho documents the organization-wide open
   tracking control in its [tracking guide](https://help.zoho.com/portal/en/kb/campaigns/user-guide/email-campaigns/create-campaign/articles/managing-email-open-tracking-in-zoho-campaigns-2-0).
5. Create a dedicated VISUALIZE-SH mailing list and a newsletter topic. Do not
   upload contacts without consent. Keep Zoho's unsubscribe and suppression
   handling enabled. In the list's **Setup** tab, copy the
   [List Key](https://www.zoho.com/campaigns/help/developers/list-management.html).
6. Open **Audience → Forms**, create an **embedded** compact, banner, or long form,
   and associate exactly that list and topic. Collect only the email field unless
   another field is necessary; add plain-language consent and the published privacy
   notice. Do not add Beacon Tracking. Launch the form, then use **Form Code → Form
   URL & QR Code → Form URL** and retain the public HTTPS URL. Zoho documents the
   current flow in [Creating signup forms](https://help.zoho.com/portal/en/kb/campaigns-3-0/user-guide/audience/forms/articles/v3-how-to-create-forms).
7. Open **Settings → Consent and privacy → Double opt-in**, enable it, and review
   the confirmation sender, subject, and content. Zoho's
   [double-opt-in guide](https://help.zoho.com/portal/en/kb/campaigns-3-0/user-guide/settings/consent-and-privacy/articles/v3-setting-up-double-opt-in)
   describes the current controls.
8. Record the list key, verified sender, and topic ID in a password manager. Newer
   topic-management accounts can require `topicId` when creating a campaign. If
   Zoho does not expose the ID in the UI, use a separate, temporary grant with
   `ZohoCampaigns.contact.READ` to call the
   [Get Topics endpoint](https://www.zoho.com/campaigns/help/developers/get-topics.html),
   record the ID, and revoke that temporary grant. Do not add contact-read access
   to the production delivery token.

Use the hosted form as a normal outbound link. VISUALIZE-SH deliberately does not
embed the form, set cookies, remember dismissals, or run analytics. Zoho's own
privacy and consent terms apply after the visitor follows that link. A Zoho popup
form is intentionally not embedded because its optional dismissal cookie would
create a cookie-disclosure obligation on the app.

## 2. Create least-privilege OAuth credentials

1. Open the [Zoho API Console](https://api-console.zoho.com/) for the same
   account/data center. Choose **Get Started → Self Client → Create Now**. Zoho
   describes Self Client as the option for backend access to the owner's own
   account in its [Self Client overview](https://www.zoho.com/developer/oauth/self-client/overview.html).
2. In **Generate Code**, create a short-lived, one-time authorization code with only
   `ZohoCampaigns.campaign.CREATE` and `ZohoCampaigns.campaign.UPDATE` (or the
   console's combined `ZohoCampaigns.campaign.CREATE-UPDATE`) scopes. Do not grant
   CRM, Mail, contact export, Campaigns `ALL`, or other unrelated scopes.
   Select the Campaigns app and the correct organization/portal if prompted.
   These are the scopes documented for Zoho's
   [create](https://www.zoho.com/campaigns/help/developers/create-campaign.html)
   and [send](https://www.zoho.com/campaigns/help/developers/send-campaign.html)
   endpoints used by `scripts/send-zoho-campaign.ts`.
3. Exchange that code before it expires at the data center's `/oauth/v2/token`
   endpoint using `grant_type=authorization_code`, the client ID, and client
   secret. The response contains the one-hour access token and the long-lived
   refresh token; the exact fields and data-center requirement are in Zoho's
   [authorization-code instructions](https://www.zoho.com/developer/oauth/self-client/authorization-code-flow.html).
   Never put this request URL, response, or token values in shell history, chat, a
   screenshot, or a repository file. Put the client ID, client secret, and refresh
   token directly into the `zoho-production` GitHub environment secrets below.
4. Delete any temporary local note containing the grant code. Keep a recovery copy
   of the long-lived credentials only in the chosen password manager, then revoke
   any temporary topic-discovery token.

No one manually creates an access token before a weekly run. The delivery script
uses the refresh token to request a one-hour access token at runtime, keeps it only
in process memory, never prints it, and lets it expire. Manual action is needed
only after revocation, client rotation, data-center migration, or a security event.

## 3. Add GitHub settings

Create environment `zoho-production`, restrict it to `main`, and require a human
reviewer. Add these **environment secrets**:

- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_CAMPAIGNS_FROM_EMAIL`
- `ZOHO_CAMPAIGNS_LIST_KEY`
- `ZOHO_CAMPAIGNS_TOPIC_ID` — optional only if the account does not require or use
  a non-default topic; keep it secret as account metadata.

Add these **repository variables**:

- `ZOHO_ACCOUNTS_URL` — the selected data-center Accounts origin.
- `ZOHO_CAMPAIGNS_API_URL` — the matching Campaigns API base ending in
  `/api/v1.1`.
- `NEWSLETTER_PUBLIC_ORIGIN` — the deployed VISUALIZE-SH HTTPS origin.
- `NEWSLETTER_SIGNUP_URL` — the published Zoho hosted-form URL (`zc.vg` or a
  `maillist-manage.com` host); this is intentionally public and becomes the web
  app's signup link. Leave it unset until the form points to the intended list,
  includes consent and privacy information, and double opt-in is confirmed.

The recipient list is referenced by its secret list key and, when applicable, its
topic ID. Individual destinations are managed in Zoho through the
consent-controlled list and never stored as GitHub configuration. Configure the
reply-to behavior in Zoho Campaigns itself; the documented Campaigns v1.1
`createCampaign` endpoint does not expose a reply-to parameter. The delivery
script allowlists exact Zoho data-center endpoint pairs so a changed repository
variable cannot redirect OAuth credentials or the access token to another host.

## 4. Local dry-run and protected send

Render an issue locally:

```bash
npm run newsletter:render -- --date 2026-09-20
```

This writes public browser HTML, email-safe HTML, and the digest index. The exact
site disclaimer is included, and the files contain no JavaScript, forms, tracking
pixels, analytics, cookies, or external assets.

`newsletter:zoho` defaults to a dry-run. It validates local argument and variable
formats but makes no Zoho request and cannot verify credentials or account
settings. It requires the public email URL, sender address, and list key even for
that local check. `newsletter:zoho:draft` creates a remote campaign draft; the protected
workflow uses `newsletter:zoho:publish` only after the explicit `SEND` confirmation
and environment approval.

Before the first production send, set the protected environment's list-key secret
to a consented Zoho test list and run the same reviewed-PR delivery path. Review desktop/mobile
previews, plain-text fallback behavior, every source link, the unsubscribe footer,
sender authentication, disabled tracking, and the clinical-advice disclaimer.
Confirm that Zoho adds its required organization and unsubscribe footer around the
imported content. Check the Zoho audit log and actual test-list receipt, then
replace the list-key secret with the production list key only after signoff.
The send endpoint can return an in-progress status, so an accepted API response
is not proof of delivery. Never retry a failed send until you have confirmed the
earlier attempt did not already deliver.
