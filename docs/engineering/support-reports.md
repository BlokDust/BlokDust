# Support reports

CHG-0036 implements [the support spec](../specs/domains/support/in-app-feedback-and-diagnostic-reports.md).
Users open General → Connect. Email replies are manual; no email is sent by the Worker.

## Local review
Run `pnpm web:build`, then `pnpm bd server dev`. Both the sharing and support migrations are applied automatically.
`pnpm test:support` starts an isolated Worker and databases, drives the panel and checks storage/expiry end to end.

## Remote setup
`pnpm bd server setup --env staging` creates/discovers the separate support database and saves
`BLOKDUST_STAGING_SUPPORT_DATABASE_ID` outside the checkout. Production uses its own equivalent setting/database.
`pnpm bd server deploy --env staging` migrates both databases and installs the daily cleanup trigger. Production
remains subject to the repository's merge-first rule. Provider account/backup access must be restricted to staff.

The plugin's public endpoint is compiled from `BLOKDUST_SUPPORT_PUBLIC_URL` (a public app base URL), defaulting to
`BLOKDUST_PRODUCTION_PUBLIC_URL`. This intentionally public value must not contain tokens or private hosts.
Web reports use the current site's base path. A plugin build with no public URL reports that support is unconfigured.
Build and deploy the receiving API before distributing a plugin configured for it.
`pnpm test:support:plugin` exercises the real macOS plugin WebView against staging, verifies the stored native
system details and patch, and deletes its own test report. It requires a plugin built for the staging support URL. The endpoint accepts no cookies
or client credentials, and its credential-free CORS supports native WebView origins. Validate platform WebViews
when distributing new platform builds; native crash reporting is outside this implementation.

## Initial staff workflow
Use authenticated Cloudflare D1 access to the **support** database; no public read/admin route exists. Inspect the
new queue at least weekly. Treat message, email, diagnostic text and attachment values as untrusted data. Never
paste raw reports into executable SQL or HTML. Keep exports private and expire them under the same retention policy.

Useful read-only query (choose the database/environment through the existing server configuration tooling):

```sql
SELECT id, created, kind, version, surface, status, category, severity, priority, review_due, fingerprint
FROM support_reports
WHERE status = 'new'
ORDER BY priority DESC, created ASC;
```

`support_context` contains optional detailed system, patch and diagnostics for 90 days. `support_reports` retains message,
optional contact email, build, broad surface and triage fields for 365 days. `support_triage_events` records future
staff actions and AI suggestions, with `source` distinguishing them. A dashboard must update triage fields and append
an audit event in one transaction, authenticate staff, use parameterised queries, and render strings as plain text.
Do not automatically trust client-reported versions or platforms. `fingerprint` groups similar sanitised errors;
it is a hint, not proof of a duplicate or an identity. Severity, priority and spam confidence remain independent.

Future AI classification must treat submissions as untrusted quoted data, have no tool/credential access, store
suggestions separately from human decisions, and never discard reports or send replies automatically. No AI service
is called by this release.

Daily cleanup removes expired context first and cascades report deletion into remaining context/history. It is
independent of user traffic. Cron configuration follows the [Cloudflare Cron Trigger documentation](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
Cloudflare recovery/backups have a separate provider retention period; deleting live rows does not purge exports
or historical backups. Submission bodies and email addresses must not be added to request logs.

The Connect inclusion switch defaults on and controls attachments for the current submission. It never enables
background reporting. Replies show only “Thank you”; report identifiers remain internal to the API and staff tooling.
