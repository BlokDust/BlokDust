---
id: SIMULATION-0010
title: A Pulse can wait before it fires
status: accepted
date: 2026-11-17
domain: simulation
tags: [power, pulse, timing, v1-extension]
supersedes: []
superseded_by:
---
# SIMULATION-0010: A Pulse can wait before it fires

## Context
v1's Pulse powers its sources for a short time the moment a particle or beam hits it. The owner asked for a delay, so
a Pulse can switch sources on after a set time and keep them on for a set time (2026-11-17, CHG-0029).

## Decision
Pulse gets **Delay** (`delay`, 0–4 s; synced `delayBeats`, 0–4 beats at the tempo when the hit lands), default 0.
Each hit is remembered with the tick it fires at; at the start of that tick the Pulse powers the sources connected to
it then, for its length then. Hits do not restart each other's waits: each fires, so a stream of hits comes out in
the same rhythm, later (a delay line, not a retriggered timer). At most 16 hits wait per Pulse (fixed storage, no
allocation on the audio thread); more are dropped. The world POWER switch off and a transport start forget them, as
they end pulses already running.

## Consequences
- Default 0 is v1 exactly: every saved patch and golden is unchanged.
- One hit on several Pulses with different delays plays a strum or short sequence (golden `pulse-strum`).
- The free Delay and the synced one are separate params, like Pulse length and Length.

## Alternatives considered
- **A new hit restarts the wait**: simpler, but a stream of hits faster than the delay would never fire.
- **A separate Delay logic block**: one more block for what belongs to the block that already times power.
