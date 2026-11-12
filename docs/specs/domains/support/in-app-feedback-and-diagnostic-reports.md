---
id: SPEC-SUPPORT-IN-APP-FEEDBACK-AND-DIAGNOSTIC-REPORTS
title: In-app feedback and diagnostic reports
status: draft
domain: support
adrs: [SUPPORT-0001, DATA-0005]
updated: 2026-11-12
---
# In-app feedback and diagnostic reports

## Purpose
Let users send feedback, questions and bugs from the web app or plugin without leaving their patch. Prepare a
private queue for staff review within a week; the dashboard, email integration and AI classification come later.

## Requirements
- **R1.** Settings MUST offer Feedback & support. The modal MUST use the active v1 palette, Dosis typography,
  square controls and outlined actions; support small screens, focus trapping, Escape and text entry without music
  shortcuts. It MUST provide a required message (1–5000 characters), optional email and Send. Success MUST show a
  report reference. It MUST explain that the current patch and diagnostics are included, without an attachment toggle.
- **R2.** Every report MUST include version, build revision, available system details and a snapshot of the current
  patch including unsaved changes. The client and server MUST independently rebuild that snapshot from known block
  definitions. They MUST exclude sample audio, refs metadata, paths, custom identifiers, arbitrary string/object
  parameters, credentials, edit tokens and other saved patches. Sample tracks MAY retain a Freesound numeric ID;
  other tracks MUST be `file:redacted`. This intentionally makes attachments diagnostic configurations, not portable
  sample-containing saves. System details MUST use an explicit allowlist; host, plugin format, sample rate and
  buffer size are included when supplied by the plugin bridge. No localStorage enumeration is permitted.
- **R3.** A memory-only diagnostic ring MUST retain at most 100 events no older than 15 minutes. Capture unexpected
  JavaScript errors, unhandled rejections and console errors. Do not capture ordinary logs, audio glitches or missing
  samples. Diagnostic strings MUST be bounded and redact URLs, local paths, sample filenames, email addresses and
  recognised credential assignments. Logged objects MUST NOT be serialised. No general-purpose text redactor can
  guarantee removal of personal information in arbitrary free-form error messages; collection MUST stay narrow.
- **R4.** Automatic reporting MUST default off, persist only its explicit preference and be reversible in the panel.
  Enabling MUST disclose patch/diagnostic inclusion. Reports MUST include consent, the patch and diagnostics but no
  contact email. Deduplicate each kind/message per editor session; attempt at most three reports per hour per editor
  session, with one in flight. There MUST be no offline queue, replay on reconnection or submission retry.
- **R5.** An offline manual send MUST show “You need to be connected to the internet to send this support query.”
  Other delivery failures MUST show a retry message. The message MUST remain available in the panel on failure.
  Sending MUST time out after 15 seconds, disable duplicate clicks and permit manual retry. No persistent draft or
  queue is required. Automatic delivery failure MUST be silent and MUST NOT recursively generate more reports.
- **R6.** `POST /api/support` MUST write only to a dedicated support database. A streamed request MUST be limited to
  128 KiB and its sanitised patch to 64 KiB. Validate schema, build strings, message and email, ignore unrecognised
  fields, use parameterised SQL and reject the honeypot. A mandatory rate-limit binding MUST limit each source IP to
  five attempts per minute. No IP or user identifier is persisted. The public endpoint MUST expose no report reads,
  listing or staff actions. Credential-free CORS MUST permit plugin WebViews, including preflight and errors.
- **R7.** Daily scheduled cleanup MUST remove detailed system data, diagnostic events and patch attachments after
  90 days, and report text, email and related triage history after 365 days. These are live database retention limits;
  provider recovery/backups follow the provider's own retention policy. A seven-day review deadline MUST be recorded.
- **R8.** Immutable submissions MUST be separated from triage fields and append-only triage events. Prepare status,
  category, severity, priority, spam confidence, duplicate link, assignment, review timestamp, version, surface and
  error fingerprint for future filtering. AI suggestions MUST remain distinguishable from human decisions; no AI
  execution, auto-discarding, automatic replies or dashboard is part of this release. All report text is untrusted data
  and MUST be rendered as plain text by future consumers. Replies are manual through a support mailbox.

## Scenarios
- **S1.** Open Settings, send a suggestion with an optional email; a private report and sanitised current patch are
  saved, a reference appears, and shared patch storage remains unchanged (R1, R2, R6, R8).
- **S2.** Disconnect and press Send; the message remains, reconnection does not send anything, and manual retry works
  (R5). A server failure also preserves the message.
- **S3.** Enable automatic reporting, trigger an unexpected error, repeat it, then opt out: one report is sent with
  the patch; repeats and errors after opting out send nothing (R3, R4).
- **S4.** Invoke scheduled cleanup on expired context and then an expired report: context expires independently and
  report deletion cascades to triage history (R7).

## v1 reference
SettingsPanel and OptionActionButton supply the layout/style reference. The dormant Tour row is replaced in the
shim, without editing ported code. Feedback is a deliberate new v2 feature; the rest of the workspace stays unchanged.

## Verification
`pnpm test:support`: real Worker + separate local D1, input/size/rate/privacy guards, Settings pointer actions,
offline and server failures, capture, automatic consent/deduplication, mobile layout and real scheduled cleanup.
`pnpm web:typecheck`, `pnpm server:typecheck`, `pnpm test:web`, `pnpm test:sharing`, `pnpm test:ui-regressions`,
`pnpm bd ui diff`, `pnpm bd visual diff --full`, `pnpm bd plugin test`, `pnpm test:support:plugin`.
The `feedback-legacy-dialog` UI regression verifies older WebViews without native dialog methods. See CHG-0009 tasks for recorded results.
