---
id: CHG-0042
title: "Owner tweaks: keys never aim, SYNCED TO HOST, short menu, clean block edges"
status: proposed
date: 2026-11-20
specs: [SPEC-CONNECTIONS-PROXIMITY, SPEC-VISUAL-V1-PARITY]
adrs: [UI-0008, UI-0015, SHARING-0008]
---
# CHG-0042: Owner tweaks: keys never aim, SYNCED TO HOST, short menu, clean block edges

## Why
Owner review of PR #13, 2026-11-20 (iPad, GarageBand, and comments on the PR).

## What changes
1. **Keys never aim Emitters and Lasers** (SPEC-CONNECTIONS-PROXIMITY R2): a key no longer turns them to a clock
   position. Every key pressed fires the Emitter once at its own Angle (keys pressed together, once); held keys repeat
   at its rate; a Laser stays on until the last key is let go.
2. **POWER OFF and SYNCED TO HOST** on the red of v1's record button (palette 13), the switch's underline too
   (UI-0008, UI-0015). HOST STOPPED · PRESS PLAY reads SYNCED TO HOST.
3. **The Wavetable's picture in the plugins**: the engine's WASM is embedded in the plugins (it spun forever there).
4. **The block menu in a short wide view** (GarageBand above the iPad keyboard): the drop-down is as much shorter as
   the blocks are smaller (`App.MenuDrop`, a port-ui rewrite); views up to 2:1 keep v1's.
5. **Clean block edges** (render/flatLayers.ts): at full opacity each face is drawn as only what is seen of it, with a
   thin strip under the faces next to it, so no hairline of a hidden face shows round a block's outer edge.
6. **PR comments**: block descriptions are user-facing (no change IDs, owner notes or v1/v2); SHARING-0008 includes
   Apple; the gallery's ranking formula is no longer written down; the new-account limit says "Cannot create any more
   new accounts today."; owner checks ticked.

7. **Hits Cut Power** (SIMULATION-0009, SPEC-SIMULATION-POWER-AND-PARTICLES R2a; owner, 2026-11-20): one switch replaces
   Gap On Hit and Gap. A particle cuts the Power for a hit's 0.15 s; a laser beam for as long as it touches it.
8. **Stage In has no settings**: it plays as the controller outside is set (Mono/Poly, Glide, Silent Keys; R13a).
9. **engine.cpp split by job** into engine_*.cpp with a private engine_internal.hpp; no behaviour change.
10. **`pnpm bd size`**: files may hold about 5,000 tokens; those over it today (tools/size/baseline.json) may only
    shrink. A pre-commit hook runs it on the staged files.

## Out of scope
- v1's own menu icons (drawn by the ported BlockSprites) keep v1's drawing.
- Old patches' Gap and Stage In settings are simply dropped (owner: nobody else uses them yet).

## Acceptance
- Engine tests: SPEC-CONNECTIONS-PROXIMITY R2, S5, S6.
- `pnpm test:ui-regressions`: `block-menu-short-view`, `block-edges-clean`, `power-off-label-centred`, the HOST cell,
  the keyboard Emitter checks.
- `pnpm bd plugin test`: the editor serves the WASM. `pnpm test:accounts`: an id without its edit token claims nothing.
