---
id: CHG-0034
title: Laser restart and re-strike
status: proposed
date: 2026-11-17
specs: [SPEC-SIMULATION-POWER-AND-PARTICLES]
adrs: [SIMULATION-0003, SIMULATION-0012]
---
# CHG-0034: Laser restart and re-strike

## Why
A turning Laser switched by a Toggle, Pulse or Counter carries on from where it stopped, so every power-on sweeps a
different arc. The owner wants the option to start each power-on from the Laser's Angle (2026-11-17), so a switched
or pulsed sweep plays the same every time.

Particles closer than a pulse (0.15 s) keep a Laser on, so its beam reaches each block once and fast particles are
lost past it (owner, 2026-11-17).

## What changes
- `power.laser` gets `restart` (off by default, v1).
- On, the Laser goes back to its Angle each time it starts turning; a synced one counts its turn from then instead of
  from beat 0 (SPEC-SIMULATION R9a).
- The Laser panel shows a Restart switch beside Tempo Sync.
- Every particle on a Laser that only hits are holding fires its beam again: what it is on is hit again
  (SIMULATION-0012, SPEC-SIMULATION R10a).

## Out of scope
- The Sound Laser (it does not turn) and the Prism.

## Acceptance
- `test_lasers.cpp` R9a: free and synced restart, each Pulse from the Angle.
- `test_lasers.cpp` SIMULATION-0012: one far-Emitter particle per hit; Self Powered unchanged; sources and Counters
  struck per particle.
- Goldens `laser-restart` (17 sweeps across the Tone; 3 without Restart) and `laser-strike` (the owner's patch);
  every other golden unchanged.
- WASM, worklet and plugin goldens match native.

## Risks and unknowns
- A new plugin automation param (appended, so existing host parameter indices do not move).
