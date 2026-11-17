---
id: SIMULATION-0005
title: Counter pulses on its steps; Chance passes hits by chance
status: proposed
date: 2026-11-13
domain: simulation
tags: [simulation, particles, lasers, post-2-0]
supersedes: []
superseded_by:
---
# SIMULATION-0005: Counter pulses on its steps; Chance passes hits by chance

## Context
The owner wants sequencing (a Counter) and randomness (Chance), built from simple parts that chain into larger musical
structures (beats, bars, phrases, sections) without new routing.

## Decision
**Counter** is a power block in the Toggle and Pulse family (owner, 2026-11-17): a Pulse with a pattern.
- It connects by proximity to what a Pulse connects to (sources, Emitters, Lasers, Stages, Gates) and is left out of
  audio chains.
- A particle that hits it is consumed; a beam advances it once when it arrives (its rising edge), as for Toggle and Pulse.
- Each hit takes the next step. On an active step it gives its connected blocks a pulse of power as long as a particle
  hit gives a source (`pulseLength`, 0.15 s).
- The pattern is Euclidean (Steps, Hits, Rotate) or set by hand per step. "Step i is active iff i × hits mod steps <
  hits": 3 in 8 is x..x..x.; 5 in 8 is x.x.xx.x (Rotate reaches the cinquillo's other rotations).
- The count goes back to step 1 when its world powers on (the world POWER switch, a transport start, or its Stage
  gaining power) and when the panel's Reset button is pressed.

**Chance** sits in the path, never powered and never connected: a particle that enters it either passes on unchanged or
is absorbed, as by Void; a beam is decided once when it arrives and keeps that answer while it keeps hitting (deciding
per tick would flicker). It passes with probability `chance`, drawn from the block's own seeded stream (as Granular's
grains), so it is deterministic (SIMULATION-0001) and the patch seed stays visual-only.

## Consequences
- Steps 4, Hits 1 is a divider: a Counter that pulses a short Laser aimed at a second Counter carries into it, so
  counters chain into bars and phrases with no carry output.
- The Counter's sources need not sit in the line of fire; it plays what is near it.
- Counter shares Pulse's connection rules and hit handling; Chance shares its path handling with Prism.

## Alternatives considered
- **Carry and reset as inputs on the Counter** (extra hit areas or a second connection role): harder to read on the
  stage; Hits 1 already divides, and resets follow the world.
