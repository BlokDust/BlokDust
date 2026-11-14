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
- **Grid** (`input.grid`, Interaction menu): a keyboard to the engine (its first params line up with the Computer
  Keyboard's), poly by default. Panel rows: Key (the twelve notes, press one), Scale (a carousel: Major, Minor, Dorian,
  Lydian, Mixolydian, Pentatonic), switches Mono/Poly, In Key (off = chromatic) and Set Pitch, Octave, then the pads
  (UI-0010). No Glide row (a mono Grid uses the default glide).
- Pads in the options panel: 8 × 4 desktop/iPad, 6 × 5 phone, rows a fourth apart; root notes in the first slider
  colour, held pads in the second, notes outside the scale dimmed (chromatic). Any pointer that lands on a pad belongs
  to the pads until it lifts (so every finger plays). Sliding to another pad sends a per-note bend to the held note:
  the pitch moves there with no new attack. The panel is taller than v1's 240 units and opens centred in the free
  band (low on a phone), clear of the header and the bottom controls.
- Keys set pitch (CHG-0017) applies to Grid too.
- Designs: `tools/block-designer/proposed.json` (owner, 2026-11-13); copy each into its manifest unchanged. Panel mockups: owner-approved (2026-11-13).

## Out of scope
- Velocity and aftertouch from touch pressure (later, with MPE).

## Acceptance
- `pnpm test:new-blocks --only grid,grid-touch`: the pads' notes in C major, D minor and chromatic; a press sounds, a
  slide E → F changes the note with no new attack; two fingers sound two voices on a phone-sized screen; the panel
  fits.
- `pnpm test:engine`: "CHG-0019 Grid" (pads as keys, the slide as a bend, Octave).
- Owner check on an iPad and a phone.

## Risks and unknowns
- The tall panel on small phones; may need a smaller pad size there.
- A slide is a pitch bend, so it does not re-aim an Emitter or Laser the Grid is connected to, and two fingers sliding
  onto the same pad are two voices.
- Not yet tried on a real iPad or phone: owner check.
