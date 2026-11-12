---
id: CHG-0009
title: Add in-app feedback and private support reports
status: done
date: 2026-11-12
specs: [SPEC-SUPPORT-IN-APP-FEEDBACK-AND-DIAGNOSTIC-REPORTS]
adrs: [SUPPORT-0001]
---
# CHG-0009: Add in-app feedback and private support reports

## Why
Users need to report problems and suggestions from within BlokDust. Reports need enough configuration and runtime
context to investigate without sending sample audio, save credentials or unrelated browser storage.

## What changes
Settings feedback action and accessible themed panel (R1); bounded, sanitised patch/system/diagnostic capture (R2–R3);
explicit automatic-reporting consent, deduplication and caps (R4); manual offline/failure handling without a queue
(R5); write-only support API, separate D1 binding/migrations and validation/rate guards (R6); daily retention cleanup
(R7); triage fields and history for future staff tools (R8). Extend local/remote database tooling and verification.

## Out of scope
Staff dashboard, AI classifier execution, automatic replies, email delivery integration, native crash reporting,
audio monitoring, screenshots, other saved patches and persistent delivery queues. No engine behaviour changes.

## Acceptance
`pnpm test:support` passes against the real local Worker and both databases. Web/Worker typechecks and builds pass,
existing sharing and UI checks remain functional, plugin host/editor tests pass. See tasks.md for results and limits.

## Risks and unknowns
A future staff UI must authenticate staff and treat feedback/AI inputs as untrusted text. Basic public rate limits
cannot eliminate distributed spam. Plugin builds need a configured public support URL and deployed support API.
Retention applies to live rows; operator/provider backups need their own policy. Native crashes cannot be captured
by JavaScript handlers. Offline reports are not retained after closing the app. Error redaction is best effort;
no arbitrary logged object payloads or browser-storage dumps are collected.
