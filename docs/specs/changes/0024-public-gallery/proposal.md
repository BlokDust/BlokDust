---
id: CHG-0024
title: Public gallery
status: proposed
date: 2026-11-15
specs: [SPEC-SHARING-GALLERY, SPEC-SHARING-ACCOUNTS]
adrs: [SHARING-0009]
---
# CHG-0024: Public gallery

## Why
Owner, 2026-11-15, third of video export, user login and the gallery: everyone's published patches in one place,
with up votes only, filtering by block, and each patch's maker shown. It should encourage people to make patches and
share them with other BlokDust users. Moderation starts as a simple check on save and a report button.

## What changes
- D1 migration 0003: `gallery`, `likes`, `reports`.
- Worker: publish and unpublish, browse (search, popular or new), like, report; saves keep entries current; account
  deletion cleans up (SPEC-SHARING-GALLERY R1–R12).
- `pnpm bd gallery`: review reports (R10).
- Web: Patches › GALLERY, next to OPEN (R13). Tabs now have ids separate from their display order.

## Acceptance
- `pnpm test:gallery` passes; `pnpm test:accounts`, `pnpm test:sharing` and `pnpm test:ui-regressions` still pass.
- Owner: publish from a phone, like and open it on a laptop.

## Risks and unknowns
- Spam accounts: passkey sign-up has Turnstile, and saves are rate-limited per IP. Per-account limits may be needed.

## Owner review 1 (2026-11-15)
- Publishing is the ADD TO GALLERY switch on SAVE / SHARE (on by default), not a button in the gallery. Only signed-in
  users can publish; signed out, the switch says so. No "Published" message.
- The gallery copies the sample search's layout (field, rule, SEARCH above it, POPULAR / NEW where RANDOMISE was).
  The search field has no clear button. Plain words match names too.
- Rows show views (migration 0004: `patches.views`, counted when the app opens a patch).
- Someone else's patch shows "TITLE BY @NAME" on the stage; the name opens the gallery on their patches.

## Owner review 2 (2026-11-15)
- Rows have OPEN only; the list scrolls and loads more as it goes (R7a).
- Liking is a star by the credit on the stage, reporting a right-click on the credit (R8, R9); the report step no
  longer says how many reports hide a patch.
- The ADD TO GALLERY switch has an options-panel row's proportions (its icons were crowding the underline).
- BACK is at the top right of the page, its label centred under the chevron.
