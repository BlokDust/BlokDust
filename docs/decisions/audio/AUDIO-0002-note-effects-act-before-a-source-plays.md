---
id: AUDIO-0002
title: Note effects act before a source plays
status: proposed
date: 2026-11-13
domain: audio
tags: [audio, notes, post-2-0]
supersedes: []
superseded_by:
---
# AUDIO-0002: Note effects act before a source plays

## Context
The owner wants Chord, Arpeggiator and Random Note blocks that "just work" next to any source, without routing, and
wants a keyboard's held notes to decide what a particle hit plays.

## Decision
We will add **note effects**: Effect-menu blocks that connect to sources by proximity like any effect but change the
notes a source is asked to play, before its voices, whatever their place in the effect chain (as Envelope's settings
apply at gate-on, SPEC-SIMULATION-POWER-AND-PARTICLES R10b). Order between note effects: Random Note, then Chord, then
Arpeggiator.
- **Chord** adds fixed intervals to every note.
- **Arpeggiator** plays the held notes one after another, at a synced rate, or one per hit.
- **Random Note** picks each hit's note from a pool: key + scale + octave range (seeded PRNG).
- Keyboards get **Keys set pitch** (default off): keys stop sounding and only set what power and hits play. With no keys
  held a source plays its own note.

## Consequences
- Hold a chord and particles strum it; add an Arpeggiator and each hit plays the next note.
- Scales are shared with Grid (CHG-0019): one table in the engine.

## Alternatives considered
- **Effects in chain order:** the user would have to place note effects first; the owner asked for no routing.
