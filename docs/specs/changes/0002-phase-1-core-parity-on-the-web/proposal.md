---
id: CHG-0002
title: Phase 1 core parity on the web
status: approved
date: 2026-11-06
specs: [SPEC-CONNECTIONS-PROXIMITY, SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-PATCH-FORMAT-V2, SPEC-VISUAL-V1-PARITY]
adrs: [ARCHITECTURE-0002, ARCHITECTURE-0004, DATA-0001, DATA-0004, DATA-0005, SCOPE-0004, SIMULATION-0001, UI-0002, UI-0005, PLUGIN-0003, PROCESS-0004]
---
# CHG-0002: Phase 1 core parity on the web

## Why
Phase 0 proved the architecture: one deterministic C++ engine everywhere, and a stage that is pixel-identical to v1
(owner review 2026-11-06). Phase 1 turns the spike into BlokDust: the **core block set** sounding like v1, the v1 chrome
working (menus, options panels, zoom, trash, settings, share), and patches that survive a reload and can be shared by
URL. The visual harness made "looks like v1" a measurable fact; Phase 1 needs the same for "sounds like v1".

## What changes
1. **v1 audio references** (new tool `bd v1 audio`): boot v1 in Chromium with its `AudioContext` replaced by an
   `OfflineAudioContext` and seeded randomness, load a fixture (e.g. Power → Tone → Reverb), render N seconds and
   store the result. This is v1's own Tone.js + Chromium DSP, captured deterministically: the audio counterpart of
   `bd v1 capture`.
2. **Audio parity check** (`bd audio compare`, new spec SPEC-AUDIO-V1-PARITY): v2 engine renders of the same fixtures
   compared with the v1 references on level, spectrum and envelope descriptors with thresholds in
   `tests/audio/thresholds.json`, plus the existing exact golden hashes for v2-vs-v2 regression.
3. **Engine audio graph:** stereo throughout; pre-effects (Envelope, Vibrato, Scuzz) acting on sources, post-effects in
   series per chain exactly as v1's `ConnectionManager`; per-block DSP state; **rewiring crossfade** instead of v1's
   35 ms master mute (SPEC-CONNECTIONS-PROXIMITY R5); Chromium-equivalent master compressor.
4. **Core blocks** (roadmap): Tone, Noise, Microphone/Audio In, Sample (user file; Freesound as fallback, DATA-0005),
   Filter, EQ, Volume, Reverb, StereoDelay, Distortion, BitCrusher, Chorus, Phaser, Envelope, Vibrato, plus the Phase 0
   power/interaction blocks. Each: manifest → DSP class → v1 audio parity → golden fixture.
5. **v1 chrome, interactive:** header category menus with block items dragged onto the stage, the block options panel
   (v1 sliders/buttons from manifest `v1.ui`), selection and hover states, zoom buttons, drag-to-trash, settings
   (themes), share panel. Each state captured from v1 and diffed (SPEC-VISUAL-V1-PARITY). The temporary toolbar goes.
6. **Persistence:** local autosave (IndexedDB) and URL-fragment sharing (compressed patch v2; no server, Phase 2 adds
   the backend). v1 composition import stays available (DATA-0004).
7. **Dust 1–8 assignment UI** in the options panel (right-click a slider, PLUGIN-0003), used by the plugin editor.

## Out of scope
Sharing backend, embeds, oEmbed (Phase 2); plugin distribution, tempo sync, Granular (Phase 3); MCP (Phase 4);
Recorder, SampleGen (Phase 5; Convolver, PitchShifter, AutoWah, Chomp and Chopper were pulled into Phase 1 at owner review); mobile layout.

## Acceptance
- `pnpm bd ci` passes (all Phase 0 gates stay green, incl. `bd win plugin`).
- `pnpm bd audio compare`: every core block fixture within SPEC-AUDIO-V1-PARITY thresholds of its v1 reference.
- `pnpm bd render --check`: a golden fixture per core block; WASM, AudioWorklet and plugin reproduce the hashes.
- `pnpm bd visual diff --full`: chrome states (menus open, options panel, hover/selected, settings, share) pass against
  v1 references in theme 0 (all themes where captured).
- `pnpm test:e2e build-and-hear`: open the app, pick Tone from the Source menu, drag it next to a Power block, open its
  options, change a slider, and measure sound in the AudioWorklet output; reload and the patch is restored; the share
  URL opens the same patch (same render hash) in a fresh browser context.
- Owner review over Tailscale.

## Risks and unknowns
- Swapping v1's `AudioContext` for an offline one: Tone.js (BlokDust fork) may read `currentTime` or use timers in ways
  that need the virtual clock; the first task is a spike that proves or disproves the approach on Tone + Filter.
- Chromium's native nodes (BiquadFilter, WaveShaper with oversampling, DynamicsCompressor, Convolver) have specific
  implementations: thresholds are perceptual, not bit-exact, unless a port turns out cheap.
- v1's default samples (and the Convolver IR) lived on `files.blokdust.io`, which is gone: Sample needs a new default
  that respects DATA-0005 (no hosted audio).
- Freesound needs an API key (a client token in the web app); obtain it from the owner via a secret request, never in
  the repo.
