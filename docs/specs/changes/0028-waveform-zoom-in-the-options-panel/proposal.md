---
id: CHG-0028
title: Waveform zoom in the options panel
status: proposed
date: 2026-11-15
specs: [SPEC-VISUAL-V1-PARITY]
adrs: [UI-0013]
---
# CHG-0028: Waveform zoom in the options panel

## Why
Picking a tiny loop out of a long sample is hard: the waveform always shows the whole sound across the panel, so the
handles can't be placed finely (owner, 2026-11-15). And a trackpad pinch over the panel zoomed the stage behind it.

## What changes
- Every waveform in the options panel (Sample and Recorder region, Granular location, Convolver) zooms and pans
  (UI-0013): mouse wheel and trackpad pinch zoom about the pointer; a sideways swipe or Shift + wheel pans; two
  fingers pinch and slide; a drag on the waveform away from the handles pans (Sample, Recorder, Convolver).
- Zoomed in, the waveform is redrawn for the stretch shown, handles and the slider work inside it at the finer scale,
  handles outside it are hidden, and a thin bar under the waveform shows where the window is in the sound.
- A wheel or pinch over the waveform, and a trackpad pinch anywhere on the open options panel, no longer zooms the
  stage.

## Out of scope
- Saving the zoom in the patch; zoom in the plugin's own editor beyond what the shared web UI does.

## Acceptance
- `pnpm test:ui-regressions --only waveform-zoom`: wheel, Ctrl + wheel, handle drag at the finer scale, drag-pan,
  sideways swipe, two-finger pinch (first finger's press undone), zoom back out; the stage's zoom and offset never change.
- `pnpm test:ui-regressions`: everything else unchanged (unzoomed panels draw as before).

## Risks and unknowns
- iOS Safari's two-finger touch and macOS Safari's gesture events are handled but not yet tried on a device.
