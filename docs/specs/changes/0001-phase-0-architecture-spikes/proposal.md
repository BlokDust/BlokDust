---
id: CHG-0001
title: Phase 0 architecture spikes and verification harness
status: done
date: 2026-11-05
specs: [SPEC-CONNECTIONS-PROXIMITY, SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-PATCH-FORMAT-V2, SPEC-VISUAL-V1-PARITY]
adrs: [ARCHITECTURE-0001, ARCHITECTURE-0003, ARCHITECTURE-0004, PLUGIN-0001, SIMULATION-0001, UI-0001, UI-0002, UI-0005, PROCESS-0004]
---
# CHG-0001: Phase 0 architecture spikes and verification harness

## Why
The architecture rests on four bets that are cheap to test now and expensive to discover late: one C++ engine running both as WASM and natively, one TS/Pixi UI inside a JUCE WebView, a deterministic sample-accurate simulation, and pixel-level parity with v1. Phase 0 proves each with running code **and** builds the self-verification tools every later phase relies on.

## What changes
1. **Monorepo skeleton:** `engine/` (CMake, C++20, Catch2), `web/` (Vite, TS, PixiJS v8), `plugin/` (JUCE 8 CMake), `blocks/` (manifests), `tests/`; CI on macOS + Linux + Windows.
2. **Engine spike:** `Engine` with command queue, a Tone source (sine/saw/square/triangle), a Filter, a Power block, Emitter, Void; proximity connections (SPEC-CONNECTIONS-PROXIMITY R1–R3); 240 Hz fixed-tick sim (SPEC-SIMULATION R4, R5, R11).
3. **Headless renderer:** `bd render <patch.json> --seconds N` → WAV + event log + JSON descriptors; golden-audio + golden-event tests.
4. **Web spike:** Emscripten build in an AudioWorklet over MessagePort (no SAB); Pixi stage drawing the spike blocks from manifests; drag to move → engine command → connection lines.
5. **Plugin spike:** JUCE 8 VST3/AU/Standalone loading the same engine + the web bundle in `WebBrowserComponent`; validated with pluginval; renders audio with the editor closed.
6. **Visual harness:** `bd v1 capture` (done, 1x and 2x DPR), `bd visual diff` (v1 reference vs v2 render, thresholds, heatmaps), first fixtures passing for the spike blocks, and the **renderer bake-off** (UI-0005) that picks how blocks are rasterised.
7. **v1 extraction tool:** `bd v1 extract` to pull block geometry/palettes/params out of v1 sources (`BlockSprites.ts`, `ThemeManager.ts`, block classes) into draft manifests, so we port data rather than retype it.
8. **Perf baseline:** 100 blocks + 2,000 particles at 120 fps on an M-series Mac in Chrome; engine CPU per 128-frame block measured in the renderer.

## Out of scope
Full block catalogue, sharing backend, embeds, MCP, iPad.

## Acceptance
- `pnpm bd index --check` passes.
- `ctest` passes, including golden-event tests that produce the same hash on all three CI OSes.
- `pnpm bd render --check --configs release,dev` passes, and `pnpm bd wasm test` reproduces the same hashes via WASM (Node and the browser AudioWorklet).
- `pnpm bd visual diff --only block-source-ToneSource,block-effect-Filter,block-power-ParticleEmitter,block-power-Void,block-power-Power` passes against v1 references.
- pluginval (strictness 5) passes on the VST3 and AU; the plugin produces audio in a headless host test with no editor.
- Perf baseline recorded in `docs/engineering/perf-baselines.md`.

## Risks and unknowns
- Float determinism across compilers/Emscripten (mitigation: no fast-math in sim, integer/fixed-point sim positions if needed).
- WebView + WebGL performance inside DAWs (esp. Windows WebView2).
- Pixi anti-aliasing vs Canvas2D parity thresholds.
