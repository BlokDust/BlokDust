---
id: CHG-0029
title: Pulse delay
status: proposed
date: 2026-11-17
specs: [SPEC-SIMULATION-POWER-AND-PARTICLES]
adrs: [SIMULATION-0010, SIMULATION-0003]
---
# CHG-0029: Pulse delay

## Why
A Pulse fires the moment it is hit, for a fixed length. The owner wants it to switch sources on *after* a set time and
stay on for a set time (2026-11-17): one hit can then play a sequence or a strum, and any source (not only an
Emitter, with its Offset) can be moved off the beat.

## What changes
- `power.pulse` gets `delay` (0–4 s, default 0) and `delayBeats` (0–4 beats, default 0, used when Tempo Sync is on).
- Each hit waits that long, then powers the connected sources for the pulse length (SPEC-SIMULATION R2b). Every hit
  keeps its own wait (up to 16 at once), so hits closer together than the delay come out in the same rhythm, later.
  The world POWER switch off and a transport start forget the waiting hits.
- The Pulse panel gets a Delay row under Pulse length (OFF, ms, s); synced, under Length, in musical steps (OFF, 1/64
  … 1 BAR).

## Out of scope
- Showing on the block that hits are waiting (v1's look has no such state).
- Delay on Toggle.

## Acceptance
- `test_pulse_delay.cpp` (R2b): delay 0 is v1; free and synced waits; every hit keeps its wait; the 16-hit cap;
  world POWER off and transport start clear; the Prism strum.
- Golden `pulse-strum`; every other golden unchanged (default 0 is v1).
- `pnpm test:new-blocks --only pulse-delay`: rows, saved params, and the real app sounds 1 s later with a 1 s delay.
- `pnpm test:ui-regressions --only tempo-sync-options`: the Delay row in both panels.

## Risks and unknowns
- New plugin automation params (appended, so existing host parameter indices do not move).
