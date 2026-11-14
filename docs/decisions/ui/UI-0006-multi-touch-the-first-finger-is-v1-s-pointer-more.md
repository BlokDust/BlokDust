---
id: UI-0006
title: Multi-touch: the first finger is v1's pointer; more fingers take blocks, sliders or a pinch
status: accepted
date: 2026-11-11
domain: ui
tags: [touch, input, release-1]
supersedes: []
superseded_by:
---
# UI-0006: Multi-touch: the first finger is v1's pointer; more fingers take blocks, sliders or a pinch

## Context
v1 took one pointer: its ported UI (`web/src/v1ui/ported/`, not edited) keeps one hover point, one selected block, one
dragged block, and moves every "selected" slider to that pointer. Release 1 (CHG-0005 task 8, owner) asks for pinch
zoom and one block or slider per finger on touch screens.

## Decision
We will keep the first finger down as v1's one pointer, unchanged, and route each further finger in the app
(`web/src/app/main.ts`) to what it lands on:
- a block (not under the UI): dragged by that finger, powered while held and drawn pressed, as v1's pressed block;
- a slider of the open options panel: moved with v1's `SliderSet`, without marking it selected (v1 would move every
  selected slider to the first finger);
- anything while the first finger drags the stage: a pinch. Zoom follows the fingers' spread within v1's 0.25×–4×
  and the stage point under their midpoint stays under it (it pans as the midpoint moves). The zoom readout shows as
  with v1's zoom buttons; afterwards the buttons step on from the nearest of v1's levels.
When a pinch ends, the finger left down does nothing until it lifts (no jump into a stage drag).

## Consequences
- One finger and the mouse behave exactly as before; v1 parity of the single-pointer UI is untouched.
- Further fingers don't select, open panels, or drop on the trash (the trash belongs to the first finger's block).
- Pinch zoom is continuous; v1's buttons are stepped (0.25, 0.5, 1, 2, 4).
- Test: ui-regressions `multitouch` (CDP touch points).
- Trackpad (owner, 2026-11-11): a two-finger pinch zooms the same way, about the pointer. Chrome and Firefox send it
  as wheel events with `ctrlKey` (Ctrl + a mouse wheel does the same); Safari on macOS as `gesturestart/change`
  (ignored while fingers are down, as iOS sends them for a touch pinch too). A plain wheel still does nothing, as in
  v1. Test: `trackpad-pinch`.

## Alternatives considered
- **Snap to v1's zoom levels on release**: keeps zoom discrete, but the view jumps away from the fingers.
- **Several pointers inside the ported UI**: would mean rewriting v1's panels, which are ported verbatim.
