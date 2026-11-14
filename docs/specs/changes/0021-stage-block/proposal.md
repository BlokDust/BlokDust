---
id: CHG-0021
title: Stage block
status: proposed
date: 2026-11-13
specs: [SPEC-PATCH-FORMAT-V2, SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-CONNECTIONS-PROXIMITY]
adrs: [SCOPE-0006, UI-0009, UI-0012]
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

## As built (2026-11-14)
- Panel: Volume, OPEN STAGE, LOAD PATCH (a `.blokdust` file; share links not yet). No patch-name row.
- Make a stage from a selection: drag Stage out of the Source menu while blocks are selected, or Cmd/Ctrl+G. The
  selected blocks move inside and carry on. Not undoable.
- In: OPEN STAGE or a double click on the block. Out: ×, Esc, or a press outside the window.
- Tests: the browser tests live in `tests/e2e/new-blocks.ts` (`stage`, `stage-from-selection`), not in ui-regressions.
  The `stage-nested` golden pins two Stages (one held by a Power, one struck by particles); "same as flattened" is an
  engine test instead (`test_stage.cpp`).
- Limits: inside a Stage the menu has no Stage, samplers or Microphone (an inner world takes no audio files or input
  yet). Plugins play Stages in a patch but cannot make or open one (no menu item, no inside view). Keyboards and note
  effects outside do not reach blocks inside.

## Risks and unknowns
- Largest change in the set: engine world nesting, patch format, selection → stage, and the window UI. Do it last.

## Owner review 1 (2026-11-14)
- Blocks dragged onto a Stage block go inside it (it is ringed while they would), to the right of what is there, with their connections. Not undoable.

## Owner review 2 (2026-11-14)
- MAKE STAGE button while blocks are selected (UI-0012). Everything selected goes in: samplers keep their audio, the
  Microphone and Audio In hear the input inside. A selection holding a Stage cannot go in.
- Notes reach inside: the computer's keys and MIDI play Keyboards and MIDI Inputs inside Stages; a controller touching a
  Stage plays the controllers inside it, and the new **Stage In** block (inside a Stage only) (R13a).
- The title is BLOKDUST 2 (header and splash).

