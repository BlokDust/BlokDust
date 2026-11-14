---
id: CHG-0018
title: LFO
status: proposed
date: 2026-11-13
specs: [SPEC-AUDIO-V1-PARITY, SPEC-PATCH-FORMAT-V2]
adrs: [SCOPE-0005, AUDIO-0003]
---
# CHG-0018: LFO

## Why
Movement without automation: modulate any block's parameter, power blocks included (a slow LFO on laser angle).

## What changes
- **LFO** (`fx.lfo`, Effect menu): Target (carousel of "Block · Param" over connected blocks: the sliders each block's
  own panel shows, plus the Filter's frequency, gain and width), Shape (sine, square, triangle, saw: v1's wave
  buttons), Tempo Sync, Rate, Depth, Phase (AUDIO-0003). New kind `modulator`: connects to any block
  (SPEC-CONNECTIONS-PROXIMITY R2c).
- Engine: per-tick modulation in slider space; several LFOs on one param add; clamp, angles wrap.
- The open panel's slider follows the modulated value; the saved value stays unmodulated.
- Patch: the target is saved as `"<block id>:<param key>"` (SPEC-PATCH-FORMAT-V2 R3a); a target that is no longer
  connected is kept but idle (the carousel shows it as OUT OF REACH). Manifests may mark a param `curve: "log"`
  (the Filter's frequency), which an LFO then moves in octaves.
- Designs: `tools/block-designer/proposed.json` (owner, 2026-11-13); copy each into its manifest unchanged.

## Out of scope
- Modulating an LFO's own params from another LFO (allowed by the model, untested in this change).

## Acceptance
- `pnpm test:engine`: shapes, sync, sum of two LFOs, clamp and wrap, idle when disconnected.
- New goldens `lfo-filter`, `lfo-laser-angle`; wasm/worklet/plugin agree.
- `pnpm test:new-blocks --only lfo`: heard, the target's open slider follows, the carousel lists Block · Param, the
  patch keeps the target by id and the slider's own value.

## Risks and unknowns
- Which params are modulatable: carousels, buttons and switches are left out. Quantised sliders (Steps, Streams…)
  are in.
- The plugin's processor writes the `target` string when the page sets a target; not yet exercised in a DAW.
- The Filter's graph does not move with an LFO (its panel is a graph, not sliders); the sound does.
