---
id: SIMULATION-0008
title: Every particle hit strikes the source again
status: accepted
date: 2026-11-14
domain: simulation
tags: [particles, power, v1-deviation]
supersedes: []
superseded_by:
---
# SIMULATION-0008: Every particle hit strikes the source again

## Context
A particle hit gives a source a 0.15 s pulse of power (SPEC-SIMULATION R5, v1 `Config.PulseLength`). In v1 a hit
that arrives while an earlier pulse still holds the source only adds power: the note gets longer, nothing is struck.
With fast emitters (synced at 1/16 or quicker) most hits are lost, and a Random Note picks one note for the whole
run. The owner wants every particle to play (review, 2026-11-14).

## Decision
A particle hit on an audio source that only earlier hits are holding (no Power, Toggle, laser or pointer on it)
strikes it again on that tick: its power voice's envelope starts over (a sampler from its start), and an arranged
source (AUDIO-0002) lets its notes go and plays them as a new trigger, so Random Note picks again and a per-hit
Arpeggiator moves on. The pulse still lengthens the power as before; the gate goes off when the last pulse ends.

## Consequences
- A v1 deviation: patches with hits closer than 0.15 s sound more articulated than in v1. No golden changed (none
  has hits that close); `test_simulation.cpp` pins the new strikes.
- Sources held by anything other than earlier pulses are untouched, so Power + particles and lasers sound as in v1.

## Alternatives considered
- **Shorter pulses**: changes every patch's note length, not just the fast ones.
- **A per-source "retrigger" switch**: more UI for something that should just work.
