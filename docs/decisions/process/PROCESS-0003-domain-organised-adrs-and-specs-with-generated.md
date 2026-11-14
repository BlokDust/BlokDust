---
id: PROCESS-0003
title: Domain-organised ADRs and specs with generated indexes
status: accepted
date: 2026-11-05
domain: process
tags: [docs, adr, specs]
supersedes: []
superseded_by:
---
# PROCESS-0003: Domain-organised ADRs and specs with generated indexes

## Decision
- ADRs live in `docs/decisions/<domain>/<DOMAIN>-NNNN-slug.md` with frontmatter (id, title, status, date, domain, tags, supersedes, superseded_by). Statuses: proposed, accepted, deferred, rejected, superseded, deprecated.
- Specs live in `docs/specs/domains/<domain>/`, change proposals in `docs/specs/changes/NNNN-slug/`, templates in `docs/specs/templates/`.
- Indexes are generated and validated by `pnpm bd index`, and `--check` runs in CI.

## Consequences
Agents can retrieve a single domain's decisions cheaply, and stale indexes are caught mechanically.
