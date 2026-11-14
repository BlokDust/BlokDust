---
id: AUDIO-0001
title: Match v1 sound by porting Chromium Web Audio algorithms
status: accepted
date: 2026-11-06
domain: audio
tags: [audio, parity, dsp, chromium]
supersedes: []
superseded_by:
---
# AUDIO-0001: Match v1 sound by porting Chromium Web Audio algorithms

## Context
SCOPE-0004 requires v2 to sound like v1. v1's sound is Tone.js r6 (BlokDust fork) on top of the browser's native Web
Audio nodes: OscillatorNode, BiquadFilterNode, DynamicsCompressorNode, WaveShaperNode, DelayNode, ConvolverNode. The
"v1 sound" people know is Chromium's implementation of those nodes. `bd v1 audio` (CHG-0002 1.1) now captures it
exactly, and `bd audio compare` (SPEC-AUDIO-V1-PARITY) measures v2 against it.

Evidence from the first calibration (2026-11-06):
- A generic soft-knee compressor and PolyBLEP oscillators left square/saw ~1.4 dB loud with ~5% brighter spectra, and
  levels off by several dB at the master.
- Porting Chromium's DynamicsCompressor and PeriodicWave tables brought every tone fixture and the loud master fixture
  to within 0.001 dB RMS and 0.01% spectral centroid of v1.
- v1's real gain staging differs from its source code's apparent intent: Tone r6 converts dB as 2^(dB/6), every
  source passes Tone.Mono's −10 dB, `Source.Settings.output.volume` is never applied, and the master settles at −12 dB
  (MainScene.Begin's fade-in off-by-one), after the compressor, not before it. Only measurement inside v1 revealed this.

## Decision
We will reproduce v1's sound by porting the specific Chromium (Blink, BSD-licensed) Web Audio algorithms that v1 relies
on into the deterministic C++ engine, and Tone.js's composition of them, measured against v1 renders, rather than
designing our own DSP that "sounds similar". Ports keep the algorithm and constants but use double precision and
`dmath`, keep state independent of buffer segmentation, and are credited in NOTICE.md.

## Consequences
- Parity becomes measurable and close to exact; each block is "port, compare, pass".
- The engine carries some Chromium structure (32-frame compressor divisions, 36 wavetable bands per waveform, ~1.8 MB of
  tables at 48 kHz built once per engine).
- Chromium changes over time; references record the Chromium build they were captured with, and re-capturing is an
  explicit `audio-reference:` commit.
- Where v1 itself is not deterministic (Tone.Freeverb's feedback loops), we match its statistics, not one take.

## Alternatives considered
- **Own DSP tuned by ear**: cannot be verified unattended and drifted several dB in the first measurement.
- **Run Web Audio inside the engine (e.g. a WebAudio-in-C++ library)**: large, not deterministic across platforms, and
  still not Chromium's exact algorithms.
- **Use the browser's Web Audio on the web and our DSP elsewhere**: breaks "one engine everywhere" (ARCHITECTURE-0001)
  and makes the plugin sound different from the web app.
