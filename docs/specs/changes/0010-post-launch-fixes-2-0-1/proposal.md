---
id: CHG-0010
title: Post-launch fixes (2.0.1)
status: proposed
date: 2026-11-12
specs: [SPEC-VISUAL-V1-PARITY, SPEC-CONNECTIONS-PROXIMITY]
adrs: [PLUGIN-0002, PLUGIN-0005]
---
# CHG-0010: Post-launch fixes (2.0.1)

## Why
The owner's first list after 2.0.0 shipped (2026-11-12): small fixes to the web app, the plug-ins, the installers and
the README, plus the keyboard → Emitter fix from CHG-0009. Released together as 2.0.1.

## What changes
1. **Mouse-wheel zoom:** a plain wheel zooms smoothly about the pointer like a pinch (0.25×–4×); over the UI (open
   panels, header, options panel) it does nothing, as before. Not v1 (v1 had turned its wheel zoom off).
2. **Filter types** (owner, 2026-11-12, icons "option B"): new params `type` (0 Peak = v1, 1 Low pass, 2 High pass,
   3 Band pass) and `Q` (width, default 1 = v1). Gain is the Peak's gain, the Low/High pass resonance (dB, Web Audio's
   Q) or the Band pass level. The panel (`web/src/v1ui/filterPanel.ts`) is the EQ's graph with one handle, plotting
   the real response, and a TYPE row like the Tone's WAVE row. Defaults keep every v1 patch sounding the same.
3. **App icon:** `assets/app-icon.svg`/`.png` in the site favicon's style; JUCE makes the `.icns`/`.ico`.
4. **BlokDust FX is plug-in only:** VST3 and AU, no Standalone (macOS pkg, Windows installer; the Windows installer
   deletes a 2.0.0 FX app). PLUGIN-0005 amended.
5. **Plug-ins start empty:** the instrument opens an empty scene (`web/src/demo/plugin-start.patch.json`), FX opens
   Audio In alone (`web/src/demo/fx.patch.json`) so audio passes through. The web keeps its demo for first visits.
6. **Windows download is a zip** with the installer and `README.txt` (SmartScreen steps); the note leaves the site.
7. **CHG-0009** (keyboard notes fire Emitters) merged in.
8. **Download page:** the intro's second sentence starts its own line (desktop and phone).
10. **The instrument shows in Logic's AU Instruments** (owner, 2026-11-12): JUCE's AU wrapper enables every bus, so
   the instrument's side-chain input made it report only input configurations ([1,1] [1,2] [2,1] [2,2]), and Logic left
   it out of AU Instruments. The Audio Unit has no input bus now (it reports [0,1] [0,2]); the VST3 and Standalone
   keep the side-chain. In Logic, audio goes in through BlokDust FX. `bd plugin au` requires [0, 2] for the instrument.
12. **START feels instant** (owner, 2026-11-12: seconds between the press and the intro). The intro starts on the press
   (v1 Splash.MouseDown), not the release. The AudioContext (suspended until the press), the worklet and the WASM are
   made while the start screen shows, so START only builds the node. A touch starts the audio when it lifts.
9. **README:** a GIF of BlokDust in place of the "BV" icon, no MCP/AI-chat mentions, an accurate status, and
   `CHANGELOG.md` listing what v2 adds over v1.

## Out of scope
- Notch and shelf types; the Filter's rolloff stays −12 dB/octave (one biquad).

## Acceptance
- `pnpm test:ui-regressions --only mouse-wheel-zoom,trackpad-pinch,settings-download,filter-types,start-on-press` pass
  (`mouse-wheel-zoom`, `filter-types` and `start-on-press` failed before the change).
- `pnpm test:engine`: the "CHG-0010 Filter …" cases (they failed before the change).
- `pnpm bd render --check --configs release,dev` 20/20 (new `plugin-start` and `filter-types`, updated `fx-demo`; the
  other goldens unchanged, so v1 Filters sound the same); `pnpm bd wasm test`.
- `pnpm bd plugin test`, `pnpm bd plugin au` (the AUs' built-in start patches equal native renders).
- `pnpm test:engine`, `pnpm test:web`, `pnpm check`, `pnpm bd privacy check`.

## Risks and unknowns
- A 2.0.0 macOS install keeps `/Applications/BlokDust FX.app`; the pkg has no scripts to remove it.
- Funputs' download-analytics Worker counts the Windows zip from funputs PR #93 (merged 2026-11-12).
