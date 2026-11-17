---
id: SIMULATION-0012
title: A particle on a Laser fires its beam again
status: accepted
date: 2026-11-17
domain: simulation
tags: [lasers, particles, power, v1-deviation]
supersedes: []
superseded_by:
---
# SIMULATION-0012: A particle on a Laser fires its beam again

## Context
A particle hit gives a Laser a 0.15 s pulse of power (SPEC-SIMULATION R5). Hits closer than that (a 1/16 emitter at
120 BPM) keep it on, so its beam reaches each block once and what it powers never hears the rest: the owner's patch
of a fast Emitter into a Laser whose beam powers a second Emitter got one particle out per beam, not per hit (review,
2026-11-17). SIMULATION-0008 already makes every particle strike an audio source again.

## Decision
A particle hit on a Laser that only hits are holding (no Power, Toggle, press, key or Self Powered) fires its beam
again on its next tick: everything the beam is on is hit again as if it had just arrived (event `Hit`). A Toggle,
Pulse or Counter acts again; a Power with Gap On Hit gaps again; an audio source not held by a Power, Toggle or press
is struck again (as SIMULATION-0008); an Emitter or Laser that only hits are holding fires again (an Emitter fires one
particle and starts its timing over, as a key press does; a Laser passes it on down the chain). The power itself is
unchanged: the beam stays on until the last pulse ends.

## Consequences
- A v1 deviation, for hits closer than a pulse only; no golden changed. `test_lasers.cpp` and golden `laser-strike`.
- A synced Emitter on the beam still fires on its own grid while the beam holds it; unsynced, its timing starts over
  at every strike, so faster than its Fire Rate it fires once per particle.

## Alternatives considered
- **Shorter pulses on Lasers**: changes every patch's beam length, not just the fast ones.
- **Turning the beam off for a tick**: the same strikes, but the powered blocks would also lose and regain power.
