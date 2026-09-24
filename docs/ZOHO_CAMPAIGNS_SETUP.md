# Zoho Campaigns setup and manual delivery

Weekly research, newsletter generation, validation, and approval happen in the
owner's local Codex project. Zoho Campaigns imports the **approved public HTTPS
HTML as the campaign body** after local review. Subscribers receive a normal HTML
email. The complete sequence is in `docs/LOCAL_NEWSLETTER_WORKFLOW.md`.

Never put credentials, grant codes, refresh/access tokens, subscriber exports,
sender addresses, recipient addresses, or contact lists in this public
repository, a pull request, an issue, a workflow variable, or chat.

## 1. Configure Campaigns

Enable MFA on the administrator account and store recovery codes outside the
repository.

1. Create or select the Zoho Campaigns organization in the correct Zoho data
   center. Check the Campaigns web app hostname and account identity.
2. Open **Settings → General → Company Details**. Enter the public organization
   identity, website, mailing address, and
   `https://visualize-sh.com/privacy.html`. Zoho places this information in the
   campaign footer, so use an address appropriate for public disclosure. See
   Zoho's [company-details guidance](https://help.zoho.com/portal/en/kb/campaigns/user-guide/settings/general/articles/how-to-manage-company-details).
3. Open **Settings → Email → Senders and Authentication**, add the intended
   sender, and complete mailbox verification. Publish Zoho's SPF and DKIM DNS
   records and verify them in Zoho. Maintain DMARC for the sending domain. Follow
   Zoho's [domain-authentication steps](https://help.zoho.com/portal/en/kb/campaigns/user-guide/settings/domain-authentication/articles/authenticate-my-domain).
4. Open **Settings → Campaign Policy → Campaign Tracking** and choose **Do not
   track** for opens. Disable click/URL, plain-text, reply, Google Analytics, and
   website-activity tracking. This avoids tracking pixels and rewritten source
   links; Zoho documents the organization-wide open tracking control in its
   [tracking guide](https://help.zoho.com/portal/en/kb/campaigns/user-guide/email-campaigns/create-campaign/articles/managing-email-open-tracking-in-zoho-campaigns-2-0).
5. Create a dedicated VISUALIZE-SH mailing list and newsletter topic. Add only
   consented contacts. Keep Zoho's unsubscribe and suppression handling enabled.
6. Open **Audience → Forms**, create a form associated with that list and topic,
   and collect only the email field unless more is needed. Include consent and
   the privacy notice. Do not add Beacon Tracking. Use **Form Code → Form URL & QR
   Code → Form URL** for the published HTTPS signup link. See Zoho's [form
   guide](https://help.zoho.com/portal/en/kb/campaigns-3-0/user-guide/audience/forms/articles/v3-how-to-create-forms).
7. Open **Settings → Consent and privacy → Double opt-in**, enable it, and review
   the confirmation sender, subject, and content. See Zoho's [double-opt-in
   guide](https://help.zoho.com/portal/en/kb/campaigns-3-0/user-guide/settings/consent-and-privacy/articles/v3-setting-up-double-opt-in).

The site links to the hosted form. It does not embed Zoho code, set signup
cookies, remember dismissals, or run analytics. Zoho's own privacy and consent
terms apply after a visitor follows that link.

## 2. Import an approved issue and test it

The Sunday task produces ignored local previews and stops. After the owner
reviews the data and previews, `npm run newsletter:render -- --date YYYY-MM-DD`
writes the approved browser and email HTML to `public/digests/`. Publish those
files through the normal repository review path, then run the local exact-content
check after GitHub Pages deploys:

```sh
npm run newsletter:delivery:check -- --date YYYY-MM-DD
```

Use the verified URL printed by that command in Zoho Campaigns. Create a
**regular email campaign**, select **Import HTML from URL**, and choose the
verified sender, topic, and **test list**. Zoho's current [campaign creation
guide](https://help.zoho.com/portal/en/kb/campaigns-3-0/user-guide/email-campaigns/articles/v3-create-an-email-campaign-in-zoho-campaigns)
documents URL import, test email, and launch. Inspect the imported content,
desktop/mobile rendering, plain-text fallback, every link, disclaimer, company
footer, unsubscribe mechanism, tracking behavior, and actual test receipt.

For production, the owner must explicitly approve the exact issue and recipient
list locally before launching the campaign in Zoho. Confirm the sender identity
and list again at the final Zoho screen. An accepted send action is not proof of
delivery; check the campaign status and actual receipt. If the outcome is
uncertain, inspect Zoho before retrying to avoid duplicate mail.

## 3. Retire unused credentials

The manual Zoho UI path does not need the old Self Client OAuth grant, list key,
topic ID, or GitHub `zoho-production` environment secrets. After the test-list
path works and no other application uses that grant, revoke the unused refresh
token in Zoho and remove the unused GitHub secrets and environment. Keep a
recovery record in the owner's password manager until revocation is complete.
Do not copy credential values into this repository or chat.
