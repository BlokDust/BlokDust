---
id: SIMULATION-0003
title: Time is musical and tempo-aware; v1 frame timing is not reproduced exactly
status: accepted
date: 2026-11-05
domain: simulation
tags: [simulation, tempo, parity]
supersedes: []
superseded_by:
---
# SIMULATION-0003: Time is musical and tempo-aware; v1 frame timing is not reproduced exactly

## Context
The owner does not need v1's exact (frame-dependent) timing, only a similar feel.

## Decision
v1 per-frame quantities become per-second quantities at a 60 fps reference. Examples: emitter `rate` of 80 frames becomes 1.333 s; particle `speed` of 3 units/frame becomes 180 units/s; laser `rotate` becomes deg/s. Emitter and Pulse timing can also be set in beats when tempo sync is on, following the host tempo in the plugin and a patch tempo on the web.

## Consequences
The v1 importer converts frame-based params using the 60 fps reference. Importing is lossless enough for v1 patches to feel the same.

## Implementation (2026-11-07, CHG-0004 3.5)
- **Engine clock:** the engine keeps a tempo (120 BPM by default) and a beat position that advances every 240 Hz tick.
  `Command::Tempo` sets the BPM and, optionally, the position. A position is projected to the next tick, so a host
  block boundary between ticks renders identically to the native engine.
- **Tempo source:** a patch may set `tempo` (web). The plugin sends the host's tempo every audio block, and its beat
  position while the transport plays.
- **Synced Emitter:** fires each time the beat crosses a multiple of `division` (1/64 note up to 4 bars). When it
  starts mid-slot it fires at once, as a newly powered v1 emitter does.
- **Synced Pulse:** lasts `pulseBeats`. Unsynced it lasts v1's `pulseLength`; that slider was ignored before, a bug
  fixed here with a test.
- **Transport stopped:** synced blocks keep running at the host's tempo instead of freezing. BlokDust is a
  self-playing environment, so silence when the DAW stops would surprise. They relock to the song position as soon
  as the transport plays.

Owner review, 2026-11-07:
- Synced divisions include triplets (1/16T, 1/8T, 1/4T, 1/2T).
- An Emitter's `swing` (0–1) makes every second emission late by up to a third of a division.
- A Laser can sync too: one turn every |`turnBeats`| beats, anticlockwise when negative, replacing Rotate.
- New Emitters and Pulses from the menu start synced. Saved patches without `sync` keep v1 frame timing.

Owner review, 2026-11-10 (CHG-0005):
- The web's tempo is set once, in Settings (in Tour's row), not on every synced block.
- A Stereo Delay can sync: `delayBeats` at the tempo (at most 1 s), replacing Delay Time, and following tempo changes
  with the same glide as a moved slider. New delays start synced at 1/8 (v1's 0.25 s at 120 BPM).

Owner review 2, 2026-11-08 (Ableton):
- **Play resyncs the world.** When the DAW transport starts, the tick grid restarts at that sample, particles in
  flight and pulses end, and emitters start their timing again (synced: on the next grid slot, or at once on one;
  free: as when just added). Every take from the same position then plays the same, whatever happened before.
- **A synced Laser is locked to the beat:** at beat 0 it points at its Angle; one turn every |`turnBeats`|. (It was a
  per-tick step, so stops and starts shifted it.)
