---
id: CHG-0004
title: Phase 3 plugin
status: done
date: 2026-11-07
specs: [SPEC-PATCH-FORMAT-V2, SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-AUDIO-V1-PARITY]
adrs: [PLUGIN-0001, PLUGIN-0002, PLUGIN-0003, SIMULATION-0003, DATA-0005, ARCHITECTURE-0002, ARCHITECTURE-0003]
---
# CHG-0004: Phase 3 plugin

## Why
Phase 0 proved that the engine runs inside JUCE and renders the same output as the native engine (pluginval passes,
plus a REAPER smoke test). Phase 3 makes BlokDust a real instrument and effect in a DAW:
- the host's tempo, MIDI and audio drive it;
- its state lives in the DAW project;
- you can drag your own stems into it;
- Granular, the headline use of your own audio, finally makes sound.

It also lays the groundwork the owner asked for on 2026-11-07: host-aware input blocks, choosing a MIDI device or
channel, and **MPE**, so expressive controllers such as Funputs can drive tones and grains per note.

## What changes
1. **Two plugin variants** (PLUGIN-0002): *BlokDust* (instrument: MIDI in, stereo out) and *BlokDust FX* (effect: audio
   in and out; a new patch starts with an Audio Input block). Each ships as VST3, AU and Standalone, from the same web
   UI bundle inside the WebView (ARCHITECTURE-0003).
2. **Host-aware input blocks** (owner, 2026-11-07):
   - In the plugin, v1's *Microphone* is labelled **Audio Input** and carries the track's audio. In the instrument
     variant it carries the host's side-chain input when there is one. On the web it stays *Microphone*.
   - In the plugin, *MIDI Controller* is labelled **MIDI Input** and receives the host's MIDI. *Computer Keyboard* is
     unchanged.
   - Only the label differs: one block type and one manifest. The labels come from `PLUGIN_LABELS` in the UI shim, so
     patches move between the web and the plugin unchanged.
3. **MIDI source selection** (owner, 2026-11-07): the MIDI Input block gets options in v1's style (the arrows-and-name
   selector used for themes in Settings):
   - **Device:** All, or one Web MIDI input by name. Web only, because hosts merge MIDI before a plugin sees it.
   - **Channel:** Omni or 1–16.
4. **MPE** (owner, 2026-11-07; new ADR):
   - The engine gains per-note expression: each voice follows its own pitch bend (±48 semitones by default, MPE's
     standard), pressure and slide (CC74).
   - The MIDI layer understands MPE zones: the MPE Configuration Message, a lower zone (master channel 1) and an
     upper zone.
   - Web MIDI and the plugin share one MPE parser.
   - The MIDI Input block gets an MPE switch, and the zone is detected automatically when the controller sends its
     configuration.
   - Expression drives voices on Tone, Sample, SampleGen and Granular, via a mapping chosen per block. Defaults (owner, 2026-11-07): pressure → the note's volume; slide → brightness on
     Tone, grain position on Granular, sample start on Sample.
   - Funputs (or any MPE source) reaches the web through a virtual MIDI port and the plugin through the DAW's MIDI
     track.
5. **Tempo and transport** (SIMULATION-0003): emitter, pulse and laser timing can follow host tempo in beats, and the
   simulation starts and stops with the transport. On the web a patch has its own tempo.
6. **State:** the patch (v2 JSON, including `refs` and `automation`) is saved in the DAW project.
   - File samples keep the absolute path, a path relative to the project, and a fingerprint.
   - A missing file is searched for beside its last known location, then the block asks for a relink (DATA-0005).
7. **Drag your audio in:** drop files from Finder, Explorer or the DAW onto a sampler block, or onto the stage to create
   a Sample. JUCE decodes them on a background thread, never the audio thread.
8. **Granular:** v1's grain engine (Tone.js GrainPlayer settings, measured against v1), with location, spread, density,
   grain length and pitch. Per-note pitch, pressure and slide come from MPE.
9. **Dust 1–8** (PLUGIN-0003): finish the host side.
   - Lanes are renamed to their targets where the host allows it.
   - The editor's right-click assignment gets an automated host test (the gap noted in CHG-0002 1.12).
   - MIDI CC learn onto the same slots.

## Out of scope
- AUv3 and iPad (Phase 5).
- MIDI 2.0 per-note controllers, beyond MPE through MIDI 1.0.
- Recording a performance back into MIDI.
- MCP (Phase 4).

## Acceptance
- **Plugin builds and validation:** pluginval (strictness 5) passes for both variants, VST3 and AU; auval passes for
  both AUs.
- **Headless renders:** `bd plugin test` renders golden fixtures headless, identical to the native engine, for both
  variants. New fixtures cover host tempo, an MPE performance and Granular.
- **MPE:**
  - Engine tests check per-voice bend, pressure and slide, plus zone handling.
  - A recorded MPE stream (and a Funputs-style one) renders identically across native, WASM, the AudioWorklet and the
    plugin.
- **Web MIDI:** a test with a virtual MIDI port (IAC on macOS) checks device and channel selection.
- **State:** saving and reloading in a host gives the same patch, the same samples (relinked by fingerprint) and the
  same render.
- **DAWs:** smoke tests in REAPER (scripted with ReaScript, on macOS and the Windows VM), Logic Pro and Ableton Live.
  Bitwig is dropped for now: it isn't installed (owner, 2026-11-07).
- **Visual parity:** the new options (device and channel selectors, MPE switch) use v1's own option styles, checked
  with `bd ui diff` against v1's equivalent settings selector.
- `pnpm bd ci` stays green. Owner review in the DAWs on the M4.

## Risks and unknowns
- **AU host quirks:** Logic's AU validation, and side-chain bus layouts for the instrument's Audio Input.
- **MPE in Web MIDI:** Chromium only. Safari has no Web MIDI, so on Safari MPE is plugin-only.
- **Granular parity:** v1's GrainPlayer timing came from Tone.js on Chromium, so it needs an audio-parity reference,
  as Phase 1 had.
- **Automated DAW tests:** REAPER is scriptable. Logic and Live need UI automation or a manual checklist.

## Owner decisions (2026-11-07)
- MPE defaults: pressure → note volume; slide → brightness (Tone), grain position (Granular), sample start (Sample).
  Changeable per block.
- Block names: "Audio Input" and "MIDI Input" in the plugin only; the website keeps v1's names.
- DAWs: REAPER (scripted, macOS and Windows), Logic Pro and Ableton Live 12. Bitwig dropped until installed.
- MIDI selection: on the web, device and channel; in the plugin, channel only (the DAW track picks the device).
