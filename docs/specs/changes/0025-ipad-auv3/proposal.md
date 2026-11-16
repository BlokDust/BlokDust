---
id: CHG-0025
title: iPad AUv3
status: proposed
date: 2026-11-15
specs: []
adrs: [PLUGIN-0001, PLUGIN-0002, PLUGIN-0003, PLUGIN-0004, UI-0004, LICENSING-0002, LICENSING-0003, DATA-0005]
---
# CHG-0025: iPad AUv3

## Why
The release plan (roadmap step 3, owner 2026-11-08) puts the iPad AUv3 between the quiet launch and the main launch:
iPad, website and plugins are announced together. PLUGIN-0001 chose JUCE 8 partly so the same `plugin/` shell builds
an AUv3 for iPadOS. The engine, the web UI and the plugin bridge are already shared; this change adds the iPadOS
build, the iPad-specific native pieces, and the tools that prove it works.

## What changes
1. **Build:** `plugin/CMakeLists.txt` builds, on iOS, `BlokDust` as an **AUv3 app extension inside the BlokDust app**
   (JUCE's Standalone is the container). iPad only for now (`TARGETED_DEVICE_FAMILY 2`, UI-0004; owner 2026-11-15),
   iPadOS 16+. Bundle IDs under Funputs, lowercase like FUNPUTS (owner, 2026-11-15): app `com.funputs.blokdust`,
   extension `com.funputs.blokdust.blokdustAUv3` (JUCE's naming); the desktop plugins move to `com.funputs.blokdust` and
   `com.funputs.blokdustfx` too (their AU/VST3 codes stay, so DAW projects still find them). Presets
   `plugin-ios-sim` (Simulator, unsigned) and later `plugin-ios` (device; team from local config, never committed).
2. **Same plugin, same behaviour:** the AUv3 is the same processor and WebView editor as VST3/AU: patch state in the
   host project, Dust 1–8 parameters (PLUGIN-0003), MIDI and MPE in (PLUGIN-0004), host tempo and transport.
3. **iPad native pieces** (`plugin/src`, `#if` iOS only): no AppKit (key-up forwarding and drop routing are no-ops);
   patches in a folder shared by the app and the extension (App Group), visible in the Files app; Open/Save/samples
   through the iPadOS document picker, with picked audio copied into the app's container (local only, DATA-0005);
   delete moves nothing to a Trash that iPadOS lacks; links open only where iPadOS allows (not from an extension).
4. **BlokDust FX** as a second AUv3 extension in the same app (PLUGIN-0002), so one App Store product holds both.
5. **Tools:** `pnpm bd plugin ios build|test`: build for the Simulator, then an iOS AUv3 test host loads the extension
   out of process like AUM does: golden fixtures render bit-identical to native, state round-trips, and the editor's
   page reports `bd_ready`. Device installs and owner review builds after signing is set up.
6. **The container app** opens BlokDust full screen with output-only audio: no microphone prompt for the instrument.
   It is our own app rather than JUCE's standalone (whose iOS audio device always opens a record-capable session); it
   plays in the foreground only and its Audio In block is silent.

## Out of scope
- iPhone layout (UI-0004: phones get what the existing layout gives).
- Pricing and App Store listing text (owner decides; keep prices out of docs).
- Online publishing from the plugin (as on desktop).

## Acceptance
- `cmake --preset plugin-ios-sim && cmake --build --preset plugin-ios-sim` builds the app with the AUv3 inside.
- `pnpm bd plugin ios test` on the Simulator: golden fixtures hash like native through the loaded AUv3; state
  round-trip; editor `bd_ready` with the patch's block count.
- Owner review on a real iPad in AUM and GarageBand (and Logic for iPad, Cubasis if available): it loads, plays from
  MIDI, follows tempo, saves and restores with the host project, opens and saves `.blokdust` files that the web app
  and desktop plugins open identically.
- Desktop gates unchanged: `pnpm bd plugin test`, `pnpm bd plugin au`.

## Risks and unknowns
- **Licensing (LICENSING-0003):** the App Store build uses JUCE under the owner's JUCE 8 Starter licence (the one
  FUNPUTS uses), not JUCE's AGPL option. The Starter revenue limit covers FUNPUTS and BlokDust together. Outside
  contributions still need LICENSING-0002's CLA before they can ship on the App Store.
- **Simulator audio on the build Mac:** any record-capable audio session (`PlayAndRecord`) deadlocks Core Audio in
  the iPadOS 26.5 Simulator here (`AURemoteIO::Initialize: RPC timeout`), while output-only (`Playback`) works. JUCE's
  iOS audio device always activates `PlayAndRecord` first, so JUCE's Standalone aborts in the Simulator. Item 6 and
  the test host (item 5) use output-only sessions.
- **WebView cost on iPad:** the editor is a WKWebView plus Pixi; AUv3 extensions have tighter memory limits than apps.
  Measure on a device early.
- **Host editor sizes:** AUM, GarageBand and Logic for iPad give extensions different view sizes; the v1 UI must stay
  usable at the smaller ones.
