---
id: SIMULATION-0006
title: Prism redirects and splits hits
status: proposed
date: 2026-11-13
domain: simulation
tags: [simulation, particles, lasers, post-2-0]
supersedes: []
superseded_by:
---
# SIMULATION-0006: Prism redirects and splits hits

## Context
A mirror block was hard to read because blocks never rotate. Owner, 2026-11-13: a **Prism** whose block stays still,
with an angle setting, that can split a hit into several streams like light through a prism.

## Decision
We will make Prism a passive gate (no power, no proximity connections) with `angle` and `rotate` (as Laser,
SPEC-SIMULATION-POWER-AND-PARTICLES R9), `streams` (1–4) and `spread` (degrees). Exits fan evenly across `spread`,
centred on `angle`; it is a **fixed exit direction**, not a mirror.
- **Particle:** consumed; one new particle per stream, leaving from the prism's edge at the hit particle's speed with its
  **remaining** range, so loops between prisms die out. Never caught again by the prism that made it.
- **Beam:** continues as one beam per stream from the prism. A beam path may pass through at most 8 prisms and never the
  same prism twice; beams count against a per-tick segment budget.
- When the particle pool (`kMaxParticles`) is full, new streams are dropped (no allocation on the audio thread).

## Consequences
- Lasers can now fan out into several beams that power several blocks.
- While its panel is open, the prism draws faint exit lines, as the Laser shows its beam.

## Alternatives considered
- **Mirror** at a hidden angle: hard to predict on a block that does not rotate.
- **Fresh range for split particles:** two prisms facing each other would pass particles forever.
