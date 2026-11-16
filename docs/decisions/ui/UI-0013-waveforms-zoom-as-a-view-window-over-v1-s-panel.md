---
id: UI-0013
title: Waveforms zoom as a view window over v1's panel
status: proposed
date: 2026-11-15
domain: ui
tags: [ui, options-panel, samples, post-2-0]
supersedes: []
superseded_by:
---
# UI-0013: Waveforms zoom as a view window over v1's panel

## Context
The owner (2026-11-15) wants to pick a tiny loop out of a long sample. v1's waveform rows (Sample and Recorder
`waveregion`, Granular `waveslider`, Convolver `waveimage`) always show the whole sound across the panel's width, so on
a long sound a pixel is a long stretch of audio. The panel is v1's code ported verbatim (`web/src/v1ui/ported/`) and
must not be edited by hand. A wheel or trackpad pinch over the panel used to zoom the stage behind it.

## Decision
We will zoom a waveform as a view window `[f0, f1]` (fractions of the whole sound) per block, applied around v1's
panel in `web/src/v1ui/waveZoom.ts`: Populate gets a copy of the form with each wave row's `min`/`max` narrowed to
the window and its waveform recomputed for that stretch (v1 `GetWaveformFromBuffer`, with the whole sound's
normalisation). v1's own value ↔ pixel maths then place and drag handles and the slider unchanged. Zoomed, a row is
drawn clipped to its waveform (its name drawn again outside the clip), handles outside the window are neither drawn
nor grabbable, and a thin bar along the waveform's bottom shows where the window sits in the sound. The gestures are
the stage's: mouse wheel and trackpad pinch zoom about the pointer, a sideways swipe or Shift + wheel pans, two
fingers pinch and slide (the first finger's press is undone), Safari's gesture events pinch. A drag on the waveform
that grabs no handle pans (not Granular, where a press anywhere moves its slider, as in v1). None of it reaches the
stage. Unzoomed, nothing differs from v1.

## Consequences
- v1 parity is untouched until a waveform is zoomed; the window lives for the session (not in the patch).
- A new sound, or a different buffer, shows the whole of it again; Reverse mirrors the window with the region.
- Playhead lines map through the window.

## Alternatives considered
- **Scale the row with a canvas transform**: stretches the handles, labels and triangles.
- **Rewrite the ported OptionsPanel**: generated code; breaks the verbatim port.
