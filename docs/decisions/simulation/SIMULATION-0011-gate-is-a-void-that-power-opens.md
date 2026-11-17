---
id: SIMULATION-0011
title: Gate is a Void that power opens
status: proposed
date: 2026-11-17
domain: simulation
tags: [simulation, particles, lasers, power, post-2-0]
supersedes: []
superseded_by:
---
# SIMULATION-0011: Gate is a Void that power opens

## Context
Power only ever turns things on: nothing lets one signal stop another, so patches cannot choose a path ("play the fill on
every fourth phrase"). A block switched by the particles and beams that pass through it switches itself: the beam that
opens it then runs through and can never close it.

## Decision
We will add a **Gate** (`power.gate`, Power menu): a Void that power opens.
- It is controlled only by proximity power: it connects to Power, Toggle, Pulse and Counter, like an Emitter or Laser,
  and to nothing else. Particles and beams that reach it never switch it.
- Unpowered it is closed and acts as Void (absorbs particles, stops beams). Powered it is open: particles and beams
  pass as if it were not there. `invert` swaps the two.
- Its state is read every tick: a particle is decided as it enters, a beam is cut or let through on each tick.

## Consequences
- Signals can stop signals, so Toggles, Counters and Gates together make any on/off logic a patch needs.
- A Toggle hit by one laser can open a Gate in another laser's path: section switching without new routing.
- Its look comes from the block designer (owner), like the other post-2.0 blocks.

## Alternatives considered
- **Switched by hits through it**: switches itself (see Context).
- **A switch area and a gate area on one block** (like the Recorder's switch): two roles on one block are confusing.
- **A `powered` option on Void**: changes a v1 block.
