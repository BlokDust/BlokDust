---
id: SIMULATION-0007
title: Sound can drive the simulation (Sound Laser)
status: proposed
date: 2026-11-13
domain: simulation
tags: [simulation, audio, determinism, post-2-0]
supersedes: []
superseded_by:
---
# SIMULATION-0007: Sound can drive the simulation (Sound Laser)

## Context
The owner wants microphone and audio input (and any source) to trigger particles and lasers. A power-giving block
would power the very source it listens to, so the owner chose a **laser** that turns on with sound.

## Decision
We will add a Sound Laser: a short laser whose beam is on while the level of the sources connected to it, in a chosen
band, is above (or, inverted, below) a threshold, with a hold time. The engine measures the level at the end of each
audio block; the simulation reads the last finished measurement on its next tick (one block of latency, about 3 ms at
128 frames). It powers nothing by proximity; only its beam acts.

## Consequences
- Deterministic for a given input (SIMULATION-0001): offline renders and goldens use recorded input or engine sources.
- Feedback (the beam hitting the source it listens to) is allowed; hold time stops it chattering.
- The level meter with a threshold line is shared with the Compressor (CHG-0014).

## Alternatives considered
- **Power block with controls:** re-powers its own source.
- **Particle emitter that fires on sound:** fine, but a laser is instant and acts as a gate; chain an emitter after it
  for one-shot hits.
