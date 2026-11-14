---
id: SIMULATION-0001
title: Deterministic fixed-tick simulation inside the engine
status: accepted
date: 2026-11-05
domain: simulation
tags: [simulation, determinism, timing]
supersedes: []
superseded_by:
---
# SIMULATION-0001: Deterministic fixed-tick simulation inside the engine

## Context
In v1, emitters count rendered frames (`ParticleEmitter.Update`: `_rateCounter += 1`), particles move a fixed distance per frame, and particle hits schedule audio with `setTimeout` (`Source.ParticleCollision`). Tempo therefore varied with frame rate and machine load.

## Decision
The engine advances the world at a **fixed tick (240 Hz)** on the audio thread, driven by the sample clock. Collisions emit events with **sample offsets** inside the current audio block. All randomness comes from a per-patch seeded PRNG. Given the same patch, seed and inputs, output is bit-identical on every platform.

## Consequences
- The UI only interpolates and draws snapshots and never decides gameplay.
- Offline rendering (previews, golden tests, MCP) is possible and reproducible.
- Floating-point determinism across compilers needs care: no `-ffast-math` in sim code, explicit math functions, and cross-platform golden tests in CI.
