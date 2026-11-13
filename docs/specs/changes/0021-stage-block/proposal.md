---
id: CHG-0021
title: Stage block
status: proposed
date: 2026-11-13
specs: [SPEC-PATCH-FORMAT-V2, SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-CONNECTIONS-PROXIMITY]
adrs: [SCOPE-0006, UI-0009]
---
# CHG-0021: Stage block

## Why
Condense a patch into one source block, enter it to edit, and hear both levels running together (SCOPE-0006).

## What changes
- **Stage** (`source.stage`, Source menu): holds a copy of a patch in the patch's `macros` list (SPEC-PATCH-FORMAT-V2
  R7 changes from reserved to used). Panel: Volume, Patch name, **Open stage**, **Load patch** (from a share link or a
  file), and "Make stage from selection" in the multi-select menu (UI-0007).
- Engine: an inner world per Stage (its own blocks, connections, particles) stepped in the same tick; its output is the
  Stage block's source signal; power gates it; depth 2.
- Inside view per UI-0009 (window with pointer; phone: pointer down). Out with ×, Esc or a click outside.
- Designs: `tools/block-designer/proposed.json` (owner, 2026-11-13); copy each into its manifest unchanged.

## Out of scope
- Exposed macro knobs (a later change could reuse the LFO target picker), depth 3+.

## Acceptance
- `pnpm test:engine`: inner world runs only while powered; a hit is momentary power; depth 2 enforced; determinism.
- `pnpm bd render --check`: new `stage-nested` golden equals the same blocks flattened (minus routing differences
  documented in the test).
- `pnpm test:ui-regressions --only stage`: open, edit inside, close by ×, Esc and outside click; save and reopen.
- Owner check on desktop, iPad and phone.

## Risks and unknowns
- Largest change in the set: engine world nesting, patch format, selection → stage, and the window UI. Do it last.
