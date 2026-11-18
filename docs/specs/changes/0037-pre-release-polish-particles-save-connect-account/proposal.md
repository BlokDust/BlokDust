---
id: CHG-0037
title: Pre-release polish: particles, save, Connect, account, patches lists
status: proposed
date: 2026-11-18
specs: [SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-PATCH-FORMAT-V2, SPEC-SHARING-ACCOUNTS, SPEC-SHARING-BACKEND, SPEC-VISUAL-V1-PARITY, SPEC-SUPPORT-IN-APP-FEEDBACK-AND-DIAGNOSTIC-REPORTS]
adrs: []
---
# CHG-0037: Pre-release polish: particles, save, Connect, account, patches lists

## Why
The owner tried the combined build (with quick save and the feedback form merged) on 2026-11-18 and listed what still
felt off before release.

## What changes
- **Particles** (SPEC-SIMULATION-POWER-AND-PARTICLES R1b): CLEAR and opening a patch remove the old patch's particles
  (the engine's whole-world `Reset`, id 0). Trashing an emitter still leaves its particles flying, as v1 did.
- **SAVE** (SPEC-PATCH-FORMAT-V2): the button reads SAVING while it saves; no spinner or line under it. The link's
  layout after saving (COPY LINK, SHARE) is a mockup for the owner, not built.
- **Notifications**: v1's message bar (from CHG-0033) says STARTED RECORDING / STOPPED RECORDING (v1 Recorder) and
  MESSAGE SENT for the feedback form (SPEC-SUPPORT-IN-APP-FEEDBACK-AND-DIAGNOSTIC-REPORTS R1).
- **CONNECT** slides in and out under the tabs like the other tabs' pages.
- **ACCOUNT** (SPEC-SHARING-ACCOUNTS R7, R13, R15): STATS in place of SIGNED IN AS NAME, no "since" date, the page 35
  units higher, more room under FAVOURITE BLOCKS, no "Passkey added" line.
- **OPEN / GALLERY** (SPEC-PATCH-FORMAT-V2, SPEC-SHARING-ACCOUNTS R8): no OPEN hint; both lists start higher and are
  the same size; OPEN FROM YOUR DEVICE is a bordered button like RANDOMISE TITLE; account rows say only when saved.
- **Hints**: Chance and Counter in the owner's words. **Gate** shows its stars in the menu, as Void does.

Owner's second round (2026-11-18):
- **SAVE / SHARE link** (SPEC-PATCH-FORMAT-V2): mockup options 3 (desktop), 3c (phone) and 4: COPY LINK, SHARE on
  phones, no SAVE button while saved, SAVE CHANGES once changed. Its fields stay under the tabs while sliding.
- **One OPEN list and a real delete** (SPEC-SHARING-ACCOUNTS R8, R8a): the account's patches once each, with a bin;
  this browser's copies of them aren't listed again.
- **Own patches don't share a name** (SPEC-PATCH-FORMAT-V2): " (2)" in the name field before a new link saves.
- **Links to no patch** (SPEC-SHARING-BACKEND R4b): 410 for deleted; the message bar says why; a blank stage.

## Out of scope
- A "deletion pending" grace period (owner, 2026-11-18: not needed).

## Acceptance
- Engine: "R1b: Reset of the whole world (id 0) clears the particles in flight" (fails without the fix).
- `pnpm test:ui-regressions`: clear-and-open-clear-particles (fails without the fix), recorder-says-started-stopped,
  patches-tab-remembered (small OPEN FROM YOUR DEVICE).
- `pnpm test:support`: Connect slides in; MESSAGE SENT in the message bar.
- `pnpm test:sharing`: missing-links (fails without the fix: a made-up id opened the last stage, silently).
- `pnpm test:accounts`: open-list-delete. `pnpm test:ui-regressions`: patches-fields-under-tabs, save-names-unique,
  share-link-phone, share-link-inline, save-copies-link.
- `pnpm test:accounts`, `pnpm test:gallery`, `pnpm test:sharing` pass.

## Risks and unknowns
- The message bar sits three quarters down the screen (v1), over the lower part of an open panel for a few seconds.
