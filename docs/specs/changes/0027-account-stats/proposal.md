---
id: CHG-0027
title: Account stats
status: proposed
date: 2026-11-16
specs: [SPEC-SHARING-ACCOUNTS]
adrs: [SHARING-0008]
---
# CHG-0027: Account stats

## Why
Owner, 2026-11-16: Settings › ACCOUNT only says who is signed in. Show the user something fun about what they made
and did: favourite blocks, patches made, remixes, and silly running totals (time played, particles, laser turns),
with as few requests as possible. Accuracy does not matter for the running totals; few requests do.

## What changes
**Phase A: stats the database already has (no new requests)**
- D1 migration 0006: `patches.blocks`, the block tally of the latest revision, written on every save; patches saved
  before it are counted lazily when their owner opens the tab.
- `GET /api/me?stats=1` adds the account's stats (one D1 batch); the tab asks for it instead of plain `/api/me`
  (SPEC-SHARING-ACCOUNTS R15).
- Settings › ACCOUNT draws them with v1 pieces: numbers in the sliders' type, favourite blocks as v1's menu icons.

**Phase B: running totals (at most one extra request per session)**
- D1 migration 0007: `users.play_ms`, `blocks_added`, `particles`, `laser_turns`.
- The website estimates time played, blocks added, particles and laser turns (`web/src/account/activity.ts`) and
  keeps what isn't sent in localStorage; saves carry it, and the page sends it once when it closes
  (`POST /api/me/activity`, keepalive), unless `ACTIVITY_BEACON=off` (SPEC-SHARING-ACCOUNTS R16).
- A second row of numbers on Settings › ACCOUNT; DELETE ACCOUNT moves to the SIGNED IN line to make room.

## Out of scope
- Public profiles or showing anyone else's stats (so no anti-cheating).
- The plugin (no accounts there yet).

## Acceptance
- `pnpm test:accounts` passes, including the `stats` (R15) and `activity` (R16) checks.
- `pnpm test:gallery` and `pnpm test:sharing` still pass.
- Owner: open Settings › ACCOUNT on staging after migration 0006.

## Before staging
- Apply migrations 0006 and 0007 to the staging D1 (`wrangler d1 migrations apply --remote`).

## Risks and unknowns
- Every signed-in page close is one D1 write. If the free tier's daily writes run short, set `ACTIVITY_BEACON=off`.
- Particles fired by keys, and blocks inside a Stage while viewing it, aren't counted (estimates only).
- The tab's stats queries scan the account's patches (indexed by owner); fine for hundreds of patches per account.
