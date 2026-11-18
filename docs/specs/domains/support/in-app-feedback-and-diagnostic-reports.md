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
- **R1.** The General panel MUST restore the CONNECT tab beside SETTINGS, ABOUT and (web) DOWNLOAD. Connect MUST
  replace its obsolete guide/social contents with the support form, without a second modal or page takeover.
  Use the existing canvas typography metrics, transparent DOM text layers with title-field rules, v1 OptionSwitch
  and the filled coloured Connect GUIDE-button style. Start with “Suggest a feature, report a bug, or tell us if
  something isn’t right.” Message and email inputs MUST use the same text size; email MUST be a compact single line.
  Switch halves MUST be square with the same glyph clearance as a 60-unit OptionsPanel switch row, centred between
  the email rule and SEND. Provide message, EMAIL (optional), an initially enabled
  “Share patch and diagnostics” switch and SEND. Success MUST say only “Thank you”; the API reference
  MUST NOT be displayed. No attachment disclosure paragraph or automatic-reporting checkbox is shown.
- **R2.** Every report MUST include version/build and the message. When the inclusion switch is on, include the
  sanitised current patch (including unsaved changes), available system details and recent diagnostics. When off,
  both client and server MUST omit all three (`patch: null`, empty diagnostics/system). The switch MUST NOT enable
  background error reporting or reuse automatic-reporting consent. Independently rebuild attachments from known
  block definitions, preserving release effect connection order with remapped block IDs, excluding audio, refs metadata, paths, custom identifiers, arbitrary string/object parameters,
  credentials, edit tokens and other saved patches. Freesound numeric IDs MAY remain; other tracks MUST be
  `file:redacted`. These are diagnostic configurations, not portable sample-containing saves. No browser-storage
  enumeration is permitted.
- **R3.** A memory-only diagnostic ring MUST retain at most 100 events no older than 15 minutes. Capture unexpected
  JavaScript errors, unhandled rejections and console errors. Do not capture ordinary logs, audio glitches or missing
  samples. Diagnostic strings MUST be bounded and redact URLs, local paths, sample filenames, email addresses and
  recognised credential assignments. Logged objects MUST NOT be serialised. No general-purpose text redactor can
  guarantee removal of personal information in arbitrary free-form error messages; collection MUST stay narrow.
- **R4.** The Connect form sends only on explicit submission. Existing automatic-reporting transport remains
  disabled in this UI: the renamed attachment switch is not consent for automatic reports. Previously stored
  automatic-reporting preferences MUST NOT silently enable reporting without a separate visible consent control.
  The server retains compatibility with automatic reports from earlier clients only when explicit consent is sent.
- **R5.** An offline manual send MUST show “You need to be connected to the internet to send this support query.”
  Other delivery failures MUST show a retry message. The message MUST remain available in the Connect panel on failure.
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
- **S1.** Open General → Connect, send a suggestion with an optional email; a private report and sanitised current patch are
  saved, “Thank you” appears, and shared patch storage remains unchanged (R1, R2, R6, R8).
- **S2.** Disconnect and press Send; the message remains, reconnection does not send anything, and manual retry works
  (R5). A server failure also preserves the message.
- **S3.** Turn inclusion off and send a message: no patch, diagnostics or system context is stored. Trigger errors: no
  background report is sent by the attachment switch (R2–R4).
- **S4.** Invoke scheduled cleanup on expired context and then an expired report: context expires independently and
  report deletion cascades to triage history (R7).

## v1 reference
SettingsPanel, OptionSwitch and the Connect GUIDE button supply the layout/style reference. The release branch’s Tempo row is preserved. Connect’s body is replaced in the
shim, without editing ported code. Feedback is a deliberate new v2 feature; the rest of the workspace stays unchanged.

## Verification
`pnpm test:support`: real Worker + separate local D1, input/size/rate/privacy guards, General/Connect pointer actions,
offline and server failures, capture, attachment selection, mobile layout and real scheduled cleanup.
`pnpm web:typecheck`, `pnpm server:typecheck`, `pnpm test:web`, `pnpm test:sharing`, `pnpm test:ui-regressions`,
`pnpm bd ui diff`, `pnpm bd visual diff --full`, `pnpm bd plugin test`, `pnpm test:support:plugin`.
The `support-connect` UI regression verifies the restored tab, existing text styling and attachment switch. No native dialog API is used. See CHG-0036 tasks for recorded results.
