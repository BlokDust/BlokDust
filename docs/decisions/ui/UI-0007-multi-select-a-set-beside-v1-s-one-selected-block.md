---
id: UI-0007
title: Multi-select: a set beside v1's one selected block, ringed by its outline
status: accepted
date: 2026-11-11
domain: ui
tags: [selection, input, release-1]
supersedes: []
superseded_by:
---
# UI-0007: Multi-select: a set beside v1's one selected block, ringed by its outline

## Context
v1 selects one block at a time (its options panel) and has no multi-select. Release 1 (CHG-0005 task 9, owner) asks
for selecting several blocks by click, box and touch, moving, duplicating and deleting them together, and for an
Insert to arrive selected. The ported v1 UI (`web/src/v1ui/ported/`) is not edited.

## Decision
We will keep v1's one selected block as it is, and add a separate selection set in the app (`web/src/app/main.ts`,
drawn by `Stage.selected`):
- **Choose:** Shift+click adds or removes a block; Shift+drag on the stage draws a box; on a touch screen a finger
  held still on the stage for 450 ms, then dragged, draws a box (and does not move the stage). Cmd/Ctrl+A selects all.
  An Insert is not selected (owner, 2026-11-11).
- **Act:** dragging a selected block moves them all; Alt+drag copies them all (v1's Alt-copy, for the group) and the
  copies become the selection; Cmd/Ctrl+D duplicates them two cells down and right; Delete/Backspace or dropping them
  on the trash deletes them all.
- **Let go:** Esc, a tap on the stage, a plain click on a block outside the selection, or a plain click (no drag) on a
  selected block, which is v1's click (its options panel).
- **Look:** each selected block is ringed by its own outline moved out 4 units on every side (each edge shifted along
  its normal, so the gap is even all round), dashed, in v1's 2 px text-colour line at half strength; the box is drawn
  the same way. v1 has no selection mark; this is built from v1's outline and line. (Owner, 2026-11-11: the first
  version, grown from the block's middle, sat closer on some sides than others and was too strong.)
- **Labels** (owner, 2026-11-14, CHG-0020) are in the set too: chosen and acted on as blocks are (the box takes a label
  by its dot), and a dragged label leads the group in whole cells. Each is ringed by a dashed box round its dot and
  text. A plain click on a label still edits its words.

## Consequences
- With nothing selected, everything is v1's behaviour.
- Further fingers (UI-0006) still move only the block they hold.
- Tests: ui-regressions `multi-select`, `insert-touch` (an Insert is not selected).
- Undo (owner, 2026-11-11): Cmd/Ctrl+Z brings back what was deleted (one block or a whole selection, by key or on the
  trash; a trashed block returns where its drag began, with its settings and sound), takes out the last Insert, or
  takes blocks back out of a Stage they were put in (UI-0012), most recent first (up to 100 steps; loading or clearing a patch empties it). Tests: `undo-delete`, `undo-make-stage`.

## Alternatives considered
- **Selected blocks at 50% alpha** (v1's pressed look): reads as "being dragged" and is used for exactly that.
- **The outline on the block's edge**: invisible on blocks whose top face is the text colour (Tone, Noise).
- **The outline scaled from the block's middle**: uneven gap (owner).
