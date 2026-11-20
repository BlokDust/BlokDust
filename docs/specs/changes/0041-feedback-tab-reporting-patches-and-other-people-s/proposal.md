---
id: CHG-0041
title: Feedback tab, reporting patches, and other people's patches on the website
status: in-progress
date: 2026-11-19
specs: [SPEC-SUPPORT-IN-APP-FEEDBACK-AND-DIAGNOSTIC-REPORTS, SPEC-SHARING-GALLERY]
adrs: [SHARING-0009]
---
# CHG-0041: Feedback tab, reporting patches, and other people's patches on the website

## Why
Owner, 2026-11-19. A gallery patch made in the FX plugin (Audio In into a Bit Crusher) opened on the website and
played the visitor's microphone straight away, with no power, as loud feedback. Reporting a patch was a right-click
on its credit that nobody would find (and its CANCEL dragged the stage away: fixed in 4ab9b5e). CONNECT reads like
connecting blocks or an account.

## What changes
1. **FEEDBACK** (Settings' second tab, was CONNECT): a row of choices at the top, SUGGESTION · BUG · REPORT A PATCH.
   Suggestions and bugs go to support as now (their kind kept: `suggestion`, `bug`). REPORT A PATCH reports the
   gallery patch on the stage that isn't yours (`POST /api/gallery/:id/report` with the reason), signed in; otherwise
   it says what to do. The right-click report on the credit goes.
2. **Audio In on the website is a Microphone**: a patch's `source.audio-in` loads as `source.microphone` (same gain),
   which needs power. The plugins keep Audio In (no power: it is the DAW track).
3. **Other people's patches on the website** (opened from a link or the gallery, not your account's or this
   browser's; and embeds) start with the microphone off: the message bar says "This patch uses your microphone."
   with TURN ON; and their sound goes through a safety limit (a slow loudness compressor, then a limiter) after the
   engine. Your own patches and the plugins are unchanged.

## Out of scope
- A safety limit in the plugins (DAW users may want loud: owner's choice later).
- Checking loudness when a patch is published.

## Acceptance
- `pnpm test:support`: FEEDBACK's name and choices; a suggestion and a bug sent with their kind.
- `pnpm test:gallery`: REPORT A PATCH in FEEDBACK reports the credited patch; right-click on the credit does nothing.
- `pnpm test:ui-regressions`: `audio-in-is-microphone-on-web`, `others-patch-mic-off-and-limited`.

## Risks and unknowns
- The limiter is Web Audio's DynamicsCompressor (not the deterministic engine): the patch's own sound and golden
  hashes are untouched; only what reaches the speakers for someone else's patch.
