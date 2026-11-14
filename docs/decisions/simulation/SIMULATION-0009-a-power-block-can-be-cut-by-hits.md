---
id: SIMULATION-0009
title: A Power block can be cut by hits
status: accepted
date: 2026-11-14
domain: simulation
tags: [power, particles, lasers, v1-deviation]
supersedes: []
superseded_by:
---
# SIMULATION-0009: A Power block can be cut by hits

## Context
v1's Power block has no settings: it holds its sources on, and particles and beams pass through it. The owner wants
a way to strike Power-held sources again from the simulation (review, 2026-11-14).

## Decision
Power gets two params and, for the first time, an options panel: **Gap On Hit** (off by default) and **Gap** (10 ms
to 1 s, default 50 ms, shown while the switch is on). With the switch on, a particle that hits the Power stops there
and a beam that arrives at it (once per arrival, as a logic block) cuts its power for `gap`: its sources let go at
once and are struck again when the power comes back. A hit during a gap starts the gap over. Beams carry on through.

## Consequences
- Off (the default) is v1 exactly, so every saved patch behaves as before; no golden changed.
- The Power block now opens a panel when clicked (v1's opened none).

## Alternatives considered
- **A separate "Gap" block**: one more block for a small behaviour that belongs to Power.
