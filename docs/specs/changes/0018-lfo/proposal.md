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
- **LFO** (`fx.lfo`, Effect menu): Target (carousel of "Block · Param" over connected blocks), Shape (sine, triangle,
  square, saw), Rate (free or synced), Depth, Phase (AUDIO-0003).
- Engine: per-tick modulation in slider space; several LFOs on one param add; clamp, angles wrap.
- The open panel's slider follows the modulated value; the saved value stays unmodulated.
- Patch: the target is saved as `{block, param}`; a target that is no longer connected is kept but idle.
- Designs: `tools/block-designer/proposed.json` (owner, 2026-11-13); copy each into its manifest unchanged.

## Out of scope
- Modulating an LFO's own params from another LFO (allowed by the model, untested in this change).

## Acceptance
- `pnpm test:engine`: shapes, sync, sum of two LFOs, clamp and wrap, idle when disconnected.
- New goldens `lfo-filter`, `lfo-laser-angle`; wasm/worklet/plugin agree.
- `pnpm test:ui-regressions --only lfo-slider`: an open panel's slider moves.

## Risks and unknowns
- Which params are modulatable: discrete ones (wave shape, switches) are left out of the carousel.
