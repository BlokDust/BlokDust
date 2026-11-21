---
id: SIMULATION-0012
title: Every hit reaches through what earlier hits hold
status: accepted
date: 2026-11-17
domain: simulation
tags: [lasers, particles, power, v1-deviation]
supersedes: []
superseded_by:
---
# SIMULATION-0012: Every hit reaches through what earlier hits hold

## Context
A particle hit and a Pulse each power what they reach for a short pulse (0.15 s, or the Pulse's
length). Hits closer than that keep it on, so a Laser's beam arrives once and an Emitter on it runs on its own clock;
a Tone held by a Pulse sounds one long note. In the owner's patches (review, 2026-11-17) a 1/16 stream came out of a
Laser chain at a fraction of its rate. SIMULATION-0008 already makes every
particle strike an audio source again.

## Decision
When a pulse arrives at a block that only earlier hits are holding (from a particle or a Pulse firing), the block acts as if it had just been switched on:
- an audio source not held by a Power, Toggle, laser or press is struck again (as SIMULATION-0008);
- an Emitter fires one particle and starts its timing over (as a key press does);
- a Laser fires its beam again: everything the beam is on is hit again (event `Hit`). A Toggle, Pulse or Counter acts,
  a Power with Hits Cut Power is cut, a source not held by a Power, Toggle or press is struck, and an Emitter or Laser only
  hits hold fires again.

"Only hits" means no Power, Toggle, press, key or Self Powered. The power itself is unchanged: it ends when the last
pulse does.

## Consequences
- A v1 deviation, for hits closer than a pulse only; no golden changed. `test_lasers.cpp` and golden `laser-strike`.
- A synced Emitter that hits keep powered still fires on its own grid as well; unsynced, its timing starts over at
  every strike, so faster than its Fire Rate it fires once per hit.

## Alternatives considered
- **Shorter pulses**: changes every patch's note and beam lengths, not just the fast ones.
- **Turning the power off for a tick**: the same strikes, but powered blocks would also lose and regain power.
