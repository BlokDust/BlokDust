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
- Interaction menu gets **Label**; dropping it places a text label with a drag dot (UI-0011).
- Click to edit the text; drag the dot to move; drag to the trash to delete. Labels scale with zoom.
- Patch: optional `labels: [{id, text, x, y}]` (SPEC-PATCH-FORMAT-V2); older readers ignore it.

## Out of scope
- Rich text, sizes, colours.

## Acceptance
- `pnpm test:ui-regressions --only labels`: add, edit, move, delete, save and reopen.
- `pnpm bd render --check`: unchanged (labels have no audio).

## Risks and unknowns
- Text entry on a phone over the stage canvas.
