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
Power gets one switch and, for the first time, an options panel: **Cut By Hits** (off by default).
- A particle that hits a Power with it on stops there and cuts its power for a hit's length, 0.15 s (as a particle's hit
  on a source). A hit during a cut starts it over.
- A laser beam cuts it for as long as the beam touches it (a beam is continuous), and carries on through.
- Its sources let go at once and are struck again when the power comes back.

A particle strikes the Power-held sources again; a laser sets how long the gap lasts (owner, 2026-11-20).

## Consequences
- Off (the default) is v1 exactly, so every saved patch behaves as before; no golden changed.
- The Power block now opens a panel when clicked (v1's opened none).

## Alternatives considered
- **A separate "Gap" block**: one more block for a small behaviour that belongs to Power.
