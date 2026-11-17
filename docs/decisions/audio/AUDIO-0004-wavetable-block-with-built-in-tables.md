---
id: AUDIO-0004
title: Wavetable block with built-in tables
status: proposed
date: 2026-11-17
domain: audio
tags: [audio, source, post-2-0]
supersedes: []
superseded_by:
---
# AUDIO-0004: Wavetable block with built-in tables

## Context
The owner wants a wavetable source for unusual sounds (bells, chimes) rather than more basic waveforms (2026-11-17).
v1 had no such block, so this is a v1 deviation (SCOPE-0004, SCOPE-0005): there is no v1 sound to match. The engine
already has a deterministic, band-limited wavetable bank for the Tone (AUDIO-0001, `wavetable.hpp`). Audio must not
be stored or uploaded (DATA-0005), and the block must sound the same on the web, in the plugins and on the iPad.

## Decision
We will add **Wavetable** (`source.wavetable`, Sources menu) with four params: **Table** (a carousel of built-in
tables), **Position** (0–1, fades between neighbouring frames), **Note** and **Fine** (as the Tone). Keys, MIDI,
power and particles play it with the Tone's voice rules. Modulation stays with other blocks (LFO, Envelope, Dust
automation).

Tables are **made from maths in the engine** (`tablebank.cpp`): each frame is a spectrum of up to 512 harmonics,
band-limited per octave with the Tone's deterministic inverse FFT. Nine tables, 64 frames each: BELL, CHIME, GLASS,
GONG (inharmonic: one table cycle spans 20, 8, 48 or 24 note cycles, so partials can sit at bell and bar ratios),
VOICE, SWEEP, SYNC, FOLD, PULSE. Bands are stored at four samples per top harmonic (2048 … 64), so memory is about
1.1 MB per table **at any sample rate** (≈ 10 MB in all), built in ≈ 20 ms (native) with the engine and shared by
every voice and every Stage world. A voice reads 2 frames × 2 bands with linear interpolation. Position glides over
5 ms so stepped modulation does not click; Position changes never re-pitch a voice.

## Consequences
- No files and no audio anywhere: a patch stores the table's index and the position.
- Adding a table changes nothing that exists (append to the carousel); changing a table's maths changes the
  golden hashes of fixtures that use it.
- The options panel draws the frame with the WASM module on the main thread (as the Convolver draws its built-in
  impulse), so the picture is the engine's own table.
- Inharmonic tables repeat every `period` note cycles: very slow, inaudible as a pitch, heard as the beating real
  bells and bowls have.

## Alternatives considered
- **64 frames at Chromium's table sizes, three bands per octave:** 15–35 MB per table, far more at 192 kHz.
- **Building each table on first use:** no audio-thread allocation is allowed and the worklet has no other thread;
  20 ms at start-up is cheaper than that machinery.
- **Tables from samples or drawn by hand:** later changes (the patch would reference the sample, or store a few
  dozen harmonic numbers); not needed for the built-in sounds.
- **More params on the block (envelope, position modulation):** the owner prefers separate blocks for modulation.
