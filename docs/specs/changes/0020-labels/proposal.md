---
id: CHG-0020
title: Labels on the stage
status: proposed
date: 2026-11-13
specs: [SPEC-PATCH-FORMAT-V2, SPEC-VISUAL-V1-PARITY]
adrs: [UI-0011]
---
# CHG-0020: Labels on the stage

## Why
Patches need notes: what to press, what each part does.

## What changes
- Interaction menu gets **Label**; dragging it out places a label that follows the pointer and, once dropped, opens for
  typing (UI-0011).
- A press on a label (its dot or its words) and a drag moves it, in half grid cells; onto the bin deletes it. A press
  without a drag edits the words in place (Enter or a click elsewhere keeps them; Escape does not; no words deletes
  it). Labels scale with the zoom, show in embeds, and never reach the engine.
- Patch: optional `labels: [{id, text, x, y}]` (SPEC-PATCH-FORMAT-V2 R2b); older readers ignore it. Unsaved-changes
  checks count them. The plugin's processor keeps them with the DAW project (`bd_labels`).

## Out of scope
- Rich text, sizes, colours.
- Undo and redo of label edits (blocks have it; labels do not yet), and multi-select with blocks.

## Acceptance
- `pnpm test:ui-regressions --only labels`: add, edit, move, delete, save and reopen.
- `pnpm bd render --check`: unchanged (labels have no audio).

## Risks and unknowns
- Text entry on a phone over the stage canvas: a real text field is placed over the label, so the phone's keyboard
  opens; not yet tried on a device.

## Owner review 1 (2026-11-14)
- Phones: a label dropped from the menu opens the keyboard at once; the text field no longer makes iOS zoom the page (16 px, scaled down) and the page scrolls back when typing ends.
