# v1 assessment

Source: github.com/BlokDust/BlokDust @ `c427998` (fetch with `pnpm bd v1 fetch` → `.cache/v1`). The prebuilt `dist/` is byte-identical in rendering to femurdesign.com/blokdust (verified by screenshot hash).

## Shape
- ~25k lines of TypeScript (2015-era: RequireJS, Grunt + Gulp, Bower, TS namespaces), plus a vendored **Tone.js r6 (0.6)** and the team's own Canvas2D framework (Fayde/etch/minerva).
- Global `App` singleton used everywhere (`declare var App`).
- **32 blocks**: 7 sources, 17 effects, 6 power, 2 interaction (`app/BlockCreator.ts`).
- Fonts: Dosis, Merriweather Sans (both OFL). 13 colour themes (`Core/Visual/ThemeManager.ts`) built from palette GIFs (`config.json` lists 18 images; 5 are unused). Extracted to `blocks/v1-palettes.json`.

## Why it is slow / imprecise
1. **Frame-based simulation**: `ParticleEmitter.Update` does `_rateCounter += 1` per frame; particles move per frame; lifetime in frames. Tempo depends on display refresh and machine load.
2. **setTimeout audio triggers**: particle hits call `AddPower()` then `setTimeout(RemovePower, PulseLength)` (`Blocks/Source.ts`). Jitter tracks main-thread load.
3. **Global audio rebuild**: `ConnectionManager.Update()` mutes master, waits 35 ms, disconnects every block, rebuilds every chain, on every connection change.
4. **Brute-force collisions**: every particle vs every block per frame (`ParticleLayer.ts`); lasers re-raycast all blocks each frame while rotating (`LaserBeams.ts`).
5. **Full Canvas2D redraw** of every block, line and particle each frame.
6. **Model, view and audio fused** in each block class: drawing, Tone nodes, options form, update logic.
7. **Fragile save format**: `constructor.name` types, recursive nesting, slider-space params (`Serializer.ts`).
8. **Dead dependencies**: SoundCloud API (Sample, Granular), the old save backend, statcounter/GA.

## What v2 keeps
Proximity connections (6 gu catchment), the faceted grid-aligned block look and palettes, the block set and their sound character, remix lineage (`Parent`).

## Useful facts for porting
- `app/Blocks/BlockSprites.ts` (1,060 lines) holds all block drawing: the source for manifest geometry (`bd v1 extract`, CHG-0001 task 0.3).
- `app/Core/Visual/ThemeManager.ts` holds palette roles.
- Each block's `Outline` points (grid-relative) are its hit area.
- `App.CompositionLoadComplete(json)` accepts a v1 composition at runtime, which is how `bd v1 capture` injects fixtures.
- `Laser` + `Void` behaviour depended on iteration order (blocks behind a Void could still be powered), fixed in v2 (SPEC-SIMULATION R7).
