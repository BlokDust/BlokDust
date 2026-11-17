---
id: CHG-0029
title: Wavetable block
status: proposed
date: 2026-11-17
specs: [SPEC-AUDIO-WAVETABLE, SPEC-AUDIO-V1-PARITY]
adrs: [AUDIO-0004, SCOPE-0005, DATA-0005]
---
# CHG-0029: Wavetable block

## Why
The owner wants unusual sounds (bells, chimes, glass) from one source block, with a Position that the LFO and Dust
automation can sweep (2026-11-17).

## What changes
- **Wavetable** (`source.wavetable`, Sources menu): Table (carousel of nine built-in tables), Position, Note, Fine
  (AUDIO-0004, SPEC-AUDIO-WAVETABLE R1–R7). Keys, MIDI, power and particles play it like the Tone.
- Engine: `TableBank` (tables from maths, per-octave bands, ≈ 10 MB, shared with Stage worlds) and
  `TableOscillator`; WASM `bd_table_picture` for the panel.
- Panel: a picture of the frame being read (v1's waveform fill, in a v1 wave-image row), then Table, Position, Note,
  Fine. The picture follows an LFO moving Position.
- Shape: placeholder in `tools/block-designer/proposed.json` until the owner designs it.

## Out of scope
- Tables from a sample (user file or Freesound) or drawn in the panel: later changes.

## Acceptance
- `pnpm test:engine`: tables, bands, reference oscillators, inharmonic ratios, Position glide, segmentation.
- New goldens `wavetable-bells`, `wavetable-sweep`; `bd render --check --configs release,dev`; WASM/worklet ≡ native;
  plugin ≡ native.
- `pnpm test:new-blocks --only wavetable`: heard from the menu, the carousel and picture change with the table.

## Risks and unknowns
- Taste: the tables' maths is a first pass for the owner's ear (`tests/audio` has no v1 reference to compare).
- Start-up: building the tables adds ≈ 20 ms (native) to engine construction; measured again in WASM.
