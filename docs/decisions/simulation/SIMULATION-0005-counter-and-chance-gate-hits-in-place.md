---
id: SIMULATION-0005
title: Counter and Chance gate hits in place
status: proposed
date: 2026-11-13
domain: simulation
tags: [simulation, particles, lasers, post-2-0]
supersedes: []
superseded_by:
---
# SIMULATION-0005: Counter and Chance gate hits in place

## Context
The owner wants sequencing (a Counter) and randomness (Chance). Two models were considered: a block that catches hits
and powers the blocks connected to it (like Pulse), or a block that sits in the path and lets hits through or not
(like Void). Owner, 2026-11-13: pass-through.

## Decision
We will make Counter and Chance gates in space, never powered and never connected by proximity:
- A **particle** that enters one either passes on unchanged (same direction, speed and remaining range) or is absorbed,
  as by Void.
- A **beam** decides once when it arrives (its rising edge) and then stays open or blocked while it keeps hitting;
  deciding per tick would flicker.
- **Counter** advances one step per arriving hit and passes it when the step is active. Its pattern is Euclidean:
  Steps (length), Hits (how many active), Rotate. The count restarts when the world powers on.
- **Chance** passes a hit with probability `chance`, drawn from the patch PRNG (SIMULATION-0001).

## Consequences
- They chain in a row (emitter → counter → chance → tone) and work over distance.
- A gate never catches a particle born inside it (as SIMULATION-0004).
- New event kinds (`Pass`, `Block`) for tests and visuals.

## Alternatives considered
- **Power the connected blocks** (Pulse-like): ambiguous next to sources it should not power; cannot reach far blocks.
