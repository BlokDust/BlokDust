---
id: SIMULATION-0005
title: Counter and Chance are switches that hits set
status: proposed
date: 2026-11-13
domain: simulation
tags: [simulation, particles, lasers, post-2-0]
supersedes: []
superseded_by:
---
# SIMULATION-0005: Counter and Chance are switches that hits set

## Context
The owner wants sequencing (a Counter) and randomness (Chance), built from simple parts that chain into larger musical
structures (beats, bars, phrases, sections) without new routing.

## Decision
**Counter** and **Chance** are power blocks in the Toggle and Pulse family (owner, 2026-11-17).

**Counter** is a switch with steps (owner, 2026-11-18: "a switch with more steps to it").
- It connects by proximity to what a Toggle connects to (sources, Emitters, Lasers, Stages, Gates) and is left out of
  audio chains.
- A particle that hits it is consumed; a beam advances it once when it arrives (its rising edge), as for Toggle and Pulse.
- Each hit takes the next step. On an active step it is on: it powers its connected blocks as a Toggle that is on
  does, with no timing of its own. A hit that lands on an empty step turns it off. 2 steps with 2 hits is on from the
  first hit and stays on.
- The pattern is Euclidean (Steps, Hits, Rotate) or set by hand per step. "Step i is active iff i × hits mod steps <
  hits": 3 in 8 is x..x..x.; 5 in 8 is x.x.xx.x (Rotate reaches the cinquillo's other rotations).
- The count goes back to step 1, off, when its world powers on (the world POWER switch, a transport start, or its
  Stage gaining power) and when the panel's Reset button is pressed.

**Chance** is a switch set at random. It connects and takes hits as the Counter does; each hit rolls once, and with
probability `chance` it is on until the next hit, otherwise off. The rolls come from the block's own seeded stream (as
Granular's grains), so it is deterministic (SIMULATION-0001) and the patch seed stays visual-only.

## Consequences
- Beside a Gate (SIMULATION-0011), a Counter opens it for whole steps: a beam or stream plays in rhythmic sections. A
  Chance opens it for a random number of hits.
- Steps 4, Hits 1 is a divider: a Counter that powers a short Laser aimed at a second Counter carries into it (the beam
  arrives once each time it turns on), so counters chain into bars and phrases with no carry output.
- Beside a Tone, consecutive active steps are one held note; a note starts each time the Counter turns on. Beside an
  Emitter or Laser, they run as a Toggle would run them.
- The Counter's sources need not sit in the line of fire; it plays what is near it.
- Counter and Chance share Toggle's connection rules and hit handling.

## Alternatives considered
- **Carry and reset as inputs on the Counter** (extra hit areas or a second connection role): harder to read on the
  stage; Hits 1 already divides, and resets follow the world.
