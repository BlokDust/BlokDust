---
id: CHG-0019
title: Grid
status: proposed
date: 2026-11-13
specs: [SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-PATCH-FORMAT-V2]
adrs: [SCOPE-0005, UI-0010, AUDIO-0002]
---
# CHG-0019: Grid

## Why
A touchscreen instrument: Push-style pads in key, played inside the block's panel.

## What changes
- **Grid** (`input.grid`, Interaction menu): connects to sources like the keyboards (SPEC-CONNECTIONS-PROXIMITY R3);
  Mono/Poly and Glide as Computer Keyboard; Key, Scale carousel (Major, Minor, Dorian, Lydian, Mixolydian, Pentatonic),
  Layout (In key / Chromatic, rows in fourths), Octave (UI-0010).
- Pads in the options panel: 8 × 4 desktop/iPad, 6 × 5 phone; multi-touch chords; sliding between pads is legato.
- Keys set pitch (CHG-0017) applies to Grid too.
- Designs: `tools/block-designer/proposed.json` (owner, 2026-11-13); copy each into its manifest unchanged. Panel mockups: owner-approved (2026-11-13).

## Out of scope
- Velocity and aftertouch from touch pressure (later, with MPE).

## Acceptance
- `pnpm test:ui-regressions`: two fingers on two pads sound two voices; a finger sliding E → F changes pitch without a
  new attack; In key shows only scale notes; Chromatic darkens notes outside it.
- `pnpm test:engine`: legato path (R10d) from the Grid controller.
- Owner check on an iPad and a phone.

## Risks and unknowns
- The tall panel on small phones; may need a smaller pad size there.
