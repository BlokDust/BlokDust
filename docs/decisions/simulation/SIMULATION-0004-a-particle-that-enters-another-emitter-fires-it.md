---
id: SIMULATION-0004
title: A particle that enters another emitter fires it
status: accepted
date: 2026-11-11
domain: simulation
tags: [particles, release-1, v1-deviation]
supersedes: []
superseded_by:
---
# SIMULATION-0004: A particle that enters another emitter fires it

## Context
In v1 a particle passes straight through a Particle Emitter (`ParticleLayer` skips emitters), although a particle
hitting a Laser powers it for a pulse and a laser on an emitter powers it. Owner (2026-11-11): a particle is a little
burst of power, so one hitting an emitter should give it the power to fire a particle, like a laser does. This is a
deliberate change from v1 (SCOPE-0004 allows owner-approved improvements).

## Decision
We will let an Emitter catch a particle that enters it from outside: the particle is consumed (event `Hit` on the
emitter) and the emitter fires one particle straight away, powered or not (SPEC-SIMULATION-POWER-AND-PARTICLES R5b).
"Enters" means inside the hit outline now and not the tick before, and a particle that has not moved yet counts as born
where it is. So an emitter never catches its own particles, and two overlapping emitters don't pass one back and forth
every tick. The caught emitters fire after the particle pass, in hit order, so the event stream stays deterministic.

## Consequences
- Emitters chain: aim one at another to redirect a stream, or at several in a ring for a loop.
- Two emitters aimed at each other pass one particle back and forth for as long as it lives (each catch makes a fresh
  particle with the catcher's range): a feature, bounded by `kMaxParticles`.
- No golden fixture had a particle meet an emitter: all 18 render goldens are unchanged.
- Tests: `engine/tests/test_emitter_hit.cpp` (catch and fire once, nothing passes through, overlapping emitters, R12).

## Alternatives considered
- **A pulse of power** (as a source gets): an unsynced emitter could fire more than once in a pulse, and a synced one
  would wait for its beat; the owner asked for one new particle per hit.
- **Skip only the particle's own emitter** (remember which emitter fired it): overlapping emitters would catch each
  other's particles at birth, every tick, forever.
