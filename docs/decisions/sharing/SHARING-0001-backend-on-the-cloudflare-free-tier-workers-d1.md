---
id: SHARING-0001
title: Backend on the Cloudflare free tier: Workers + D1, immutable patches, no accounts
status: accepted
date: 2026-11-05
domain: sharing
tags: [backend, cloudflare, cost]
supersedes: []
superseded_by:
---
# SHARING-0001: Backend on the Cloudflare free tier: Workers + D1, immutable patches, no accounts

## Context
Free app and plugin, near-zero budget. Patches are small JSON.

## Decision
- **Workers** serve the API and static assets.
- **D1** stores patches (immutable rows: id, json, parent, created).
- **Turnstile** protects the save endpoint from bots.
- There are no accounts. Saving returns a share id and an unguessable *delete token* kept in the creator's browser.
- Remixing creates a new patch with `parent` set, which keeps v1's lineage idea.

## Consequences
- Fits free-tier limits for a long time, given patches of 64 KB or less.
- No moderation (SCOPE-0003), so there is **no public gallery** at launch. Sharing is by link only, as in v1. Revisit if a gallery is wanted.

## Amendment (2026-11-07, owner decision at the start of Phase 2, CHG-0003)
Saving follows v1 rather than "immutable patches":
- **Save** (v1 "overwrite") updates the same link.
- **Save As** (v1 "generate link", "create new") makes a new id with `parent` set.
- The edit token plays v1's `SessionId` role, and overwriting needs it.
- Each save is still stored as its own revision (a `revisions` row), and a link opens the latest one.
- The delete token is the same edit token.

Specified in SPEC-SHARING-BACKEND R2–R4 and R7.
