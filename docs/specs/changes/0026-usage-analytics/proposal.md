---
id: CHG-0026
title: Usage analytics
status: proposed
date: 2026-11-16
specs: [SPEC-SHARING-USAGE-ANALYTICS, SPEC-SHARING-BACKEND]
adrs: [SHARING-0010]
---
# CHG-0026: Usage analytics

## Why
After launch we only know installer downloads. The owner wants to know what people make, where they come from, which
features they use and how many people use BlokDust in a DAW (which DAW and version), with no cookie banner, no new
paid service and no risk to the other funputs sites. Decisions: SHARING-0010 (owner, 2026-11-15/16).

## What changes
- Worker: `POST /api/events` into Workers Analytics Engine, allow-listed (SPEC-SHARING-USAGE-ANALYTICS R2–R4), shares
  and Freesound searches recorded by the Worker (R6), the rate / kill switch in every page and `/api/config` (R5).
- Worker: the private dashboard `/admin/analytics` behind Cloudflare Access (R10–R11), `pnpm bd analytics`.
- Web: the event client (`web/src/analytics/client.ts`) and hooks in the app (R2), Sentry for errors (R9).
- Settings › About: "Anonymous usage stats: on/off" beside the version number; Privacy in the footer (R7, R12).
- Plugins: the daily `plugin_active` ping with DAW name and version, opt-out (R8); never from validators or test hosts.
- `/privacy.html` (R12).
- Config: per-environment datasets and rate limits (wrangler.jsonc); Access, Sentry and rate settings from local
  config (`config.example.env`); the dashboard's query token via `pnpm bd server secret`.

## Out of scope
- Events from the plugin's own page, `plugin_error`, D1 roll-ups beyond 3 months (follow-ups in tasks.md).
- The iPad AUv3 ping (needs a privacy manifest and the network entitlement: CHG-0025).
- Events for features on unmerged branches (Stage block, labels, video export, accounts, gallery): add them there.
- Switching the account to Workers Paid and creating the Sentry project (owner).

## Acceptance
- `pnpm test:analytics` passes (34 checks: ingest rules, kill switch, About switch, plugin rules, dashboard access).
- `pnpm test:sharing`, `pnpm test:ui-regressions`, `pnpm web:typecheck`, `pnpm web:build`, `pnpm test:web` pass.
- `pnpm bd plugin test` passes with the ping off; a manual run against a local Worker shows one ping a day.
- `pnpm bd index --check`, `pnpm bd privacy check` pass.

## Risks and unknowns
- The endpoint is public: counts are estimates; abuse is bounded by the rate limit, the allow-list and the rate switch.
- Until Workers Paid, analytics shares the account's free daily requests (about two per session).
- Analytics Engine's local simulation in `wrangler dev` accepts writes but can't be queried; the dashboard's queries are
  tested against a mock SQL API and need a check on staging once the token exists.
