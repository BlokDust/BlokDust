---
id: CHG-0009
title: Keyboard notes fire Emitters
status: proposed
date: 2026-11-12
specs: [SPEC-CONNECTIONS-PROXIMITY]
adrs: []
---
# CHG-0009: Keyboard notes fire Emitters

## Why
Owner report (2026-11-12): with a keyboard driving a Particle Emitter, pressing a key fires a particle, but pressing a
second key while the first is held (legato) fired nothing: the held key already powered the Emitter, so the new note
only re-aimed it. A polyphonic keyboard also fired one particle for a chord instead of one per key.

## What changes
- SPEC-CONNECTIONS-PROXIMITY R2 (S5, S6): every note-on fires a connected Emitter once at that key's angle, at once,
  and restarts its repeat interval; held keys repeat at the Emitter's Rate (or synced Division), a mono keyboard at the
  newest key, a polyphonic keyboard one particle per held key; letting go of the newest key aims at the newest key
  still held (Emitter and Laser).
- Engine: `Engine::keyAim` keeps the held keys in press order and queues presses; `runTick` fires the queued presses
  before the rate/sync counter.

## Out of scope
- Lasers stay one beam (a polyphonic keyboard does not split a Laser into several beams).
- Velocity does not change particles.

## Acceptance
- `pnpm test:engine`: "SPEC-CONNECTIONS-PROXIMITY R2 S5…", "…R2 S6…" pass (they failed before the fix).
- `pnpm web:build && pnpm test:ui-regressions --only keyboard-legato-fires-emitter,keyboard-poly-chord-fires-emitter,keyboard-powers-emitter`: all pass.
- `pnpm bd render --check --configs release,dev`, `pnpm bd wasm test`: golden hashes unchanged.

## Risks and unknowns
- A mono keyboard pressing two keys within one tick (~4 ms) fires both: each press is a note-on.
