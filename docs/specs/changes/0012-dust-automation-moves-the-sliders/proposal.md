---
id: CHG-0012
title: Dust automation moves the sliders
status: proposed
date: 2026-11-12
specs: [SPEC-PATCH-FORMAT-V2]
adrs: [PLUGIN-0003]
---
# CHG-0012: Dust automation moves the sliders

## Why
Owner (Ableton, 2026-11-12): Dust automation works, but the plugin's sliders don't move with it, not even after the
panel is closed and opened again. The processor applied Dust straight to the engine; neither the editor's blocks nor
the processor's patch (what the host saves) heard about it.

## What changes
- **Processor:** `applyDust` (audio thread) stores each slot's mapped value and marks it, lock-free. `flushDust` runs
  on the message thread: from the editor's 30 Hz timer, before the patch goes to the editor, and in
  `getStateInformation` when called there. It writes the values into the patch's block params and queues them for the
  editor.
- **Editor:** sends `bd_paramValues` `[{id, param, value}]`.
- **Page:** sets the block's params and repopulates its options panel if it is open, except while one of its sliders
  or handles is being dragged.

## Out of scope
- Showing Dust values on blocks whose panel is closed: blocks draw no param values.

## Acceptance
- `pnpm bd plugin test`: "Dust moves the saved block param" (Dust 1 = 0.75 on filter.gain saves 17.5 dB). It failed
  before the change.
- `pnpm test:ui-regressions --only dust-moves-sliders`: an open panel's slider follows, and a closed Filter panel
  opens at the new gain. It failed before the change.
