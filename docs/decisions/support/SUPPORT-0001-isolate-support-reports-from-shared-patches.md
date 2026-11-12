---
id: SUPPORT-0001
title: Isolate support reports from shared patches
status: accepted
date: 2026-11-12
domain: support
tags: [support, privacy, storage]
supersedes: []
superseded_by:
---
# SUPPORT-0001: Isolate support reports from shared patches

## Context
Users need in-app feedback with their current configuration and diagnostics. Support data and reply addresses must
not be accessible through public sharing APIs. The owner chose always-attached current patches, optional email,
opt-in automatic errors, no offline queue, and a future staff dashboard with classification.

## Decision
Use a dedicated `SUPPORT_DB` D1 database, its own migrations and a write-only `/api/support` route in the existing
Worker. Keep 90-day context separate from 365-day submission/triage records. Rebuild patch and system context with
shared allowlists on the client and server; never copy raw browser storage or audio. Keep immutable submissions
separate from mutable triage state and append-only staff/automation events.

## Consequences
Existing Worker operations and deployment tools can provision and migrate support independently. There is no
public report read API or embedded client credential. Staff initially inspect the database through existing
Cloudflare access; a future dashboard needs its own authenticated backend. Rate limits and a honeypot bound basic
abuse, but do not establish that reports are authentic; spam decisions remain a staff concern. Provider backup
retention is separate from live-row cleanup. Browser/JS error capture does not cover native crashes or DAW crashes.

## Alternatives considered
- **Shared patch tables:** public serving paths, different access and retention requirements.
- **Third-party reporting SDK:** adds collection/configuration and external routing beyond the requested simple flow.
- **Persistent delivery queue:** explicitly declined by the owner; manual retry is sufficient.

## Owner review, 2026-11-12

The form now lives in the restored Connect tab. The owner replaced the automatic-reporting checkbox with an
“Include current patch and diagnostics” switch. This is an attachment choice, initially on, enforced by the API;
it does not confer automatic-reporting consent. The form displays only “Thank you”, keeping identifiers internal.
