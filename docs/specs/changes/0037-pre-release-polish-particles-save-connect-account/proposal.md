---
id: CHG-0037
title: Pre-release polish: particles, save, Connect, account, patches lists
status: proposed
date: 2026-11-18
specs: [SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-PATCH-FORMAT-V2, SPEC-SHARING-ACCOUNTS, SPEC-SUPPORT-IN-APP-FEEDBACK-AND-DIAGNOSTIC-REPORTS]
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

## Out of scope
- The SAVE / SHARE link layout after saving (mockup sent; owner to choose).

## Acceptance
- Engine: "R1b: Reset of the whole world (id 0) clears the particles in flight" (fails without the fix).
- `pnpm test:ui-regressions`: clear-and-open-clear-particles (fails without the fix), recorder-says-started-stopped,
  patches-tab-remembered (small OPEN FROM YOUR DEVICE).
- `pnpm test:support`: Connect slides in; MESSAGE SENT in the message bar.
- `pnpm test:accounts`, `pnpm test:gallery`, `pnpm test:sharing` pass.

## Risks and unknowns
- The message bar sits three quarters down the screen (v1), over the lower part of an open panel for a few seconds.
