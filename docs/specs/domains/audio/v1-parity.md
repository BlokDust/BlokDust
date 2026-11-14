---
id: SPEC-AUDIO-V1-PARITY
title: Audio parity with v1
status: draft
domain: audio
adrs: [SCOPE-0004, PROCESS-0004, SIMULATION-0001, AUDIO-0001]
updated: 2026-11-06
---
# Audio parity with v1

## Purpose
v2 must sound like v1. This spec defines how "sounds the same" is measured, so agents can calibrate DSP unattended,
the way SPEC-VISUAL-V1-PARITY does for pixels.

## Requirements
- **R1.** Audio references come only from `pnpm bd v1 audio` at the pinned v1 commit: v1 runs in Chromium on an
  `OfflineAudioContext` with seeded randomness and a virtual clock, so the reference is v1's own Tone.js graph on
  Chromium's Web Audio nodes. Fixtures live in `tests/audio/fixtures/v1/`, references (32-bit float WAV, mono when the
  channels are identical) and a manifest with hashes and descriptors in `tests/audio/reference/v1/`.
- **R2.** Every fixture is rendered at least twice. When v1 itself is not deterministic (e.g. Tone.Freeverb's feedback
  loops of native nodes), the manifest records it with the run-to-run spread, and that spread widens the limits (R3).
- **R3.** `pnpm bd audio compare` renders each fixture with the shipped v2 WASM engine (128-frame blocks) and compares
  descriptors (`tools/lib/audio-descriptors.ts`): RMS level, spectral centroid, f0, 1/3-octave band shape (bands within
  `bandFloorDb` of the loudest), 50 ms envelope, side/mid ratio. Limits live in `tests/audio/thresholds.json`, never
  inline; a per-fixture override or `knownFailure` needs a written reason.
- **R4.** `pnpm bd audio selftest` must pass: the check accepts the reference itself and rejects a 20-cent detune, a
  1 kHz low-pass and a +2 dB change.
- **R5.** Updating references needs an explicit tool run and an `audio-reference: <reason>` commit line.
- **R6.** Exact v2 behaviour stays guarded by golden hashes (`bd render --check`); parity limits never replace them.

## Verification
`pnpm bd audio selftest` (R4); `pnpm bd audio compare` (R3) in `bd ci` once the core blocks pass.
History: Phase 0 engine 0/18; after gain staging + Chromium compressor/oscillator 10/18; after the stereo graph and
the core effects (CHG-0002 1.3–1.6) **32/33 pass** (33 fixtures: defaults, non-default params, noise colours, a serial
chain), one documented known gap (square-wave Scuzz). Facts found on the way: `docs/reference/v1-audio.md`.
Per-fixture overrides with reasons live in `tests/audio/thresholds.json`. `bd ci` runs `selftest` and `compare`.

## Notes
- f0 is the strongest spectral line moved down to a clear sub-harmonic line, and a line must stand 40 dB above its local
  neighbourhood (coloured noise has no pitch). `compare` describes the stored reference WAV on every run, so analysis
  changes never need a v1 re-capture.
