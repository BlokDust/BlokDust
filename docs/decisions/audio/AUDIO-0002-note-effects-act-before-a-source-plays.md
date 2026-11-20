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
- **Chord** gives each of the 12 notes its own chord quality (a row of bars, shifted by a Key slider), voiced
  smoothly from the previous chord, so a melody through it is harmonised rather than moved in parallel.
- **Arpeggiator** plays the held notes one after another, at a synced rate, or one per hit.
- **Random Note** draws each note from a semitone range, weighted per note by a row of 12 bars (shifted by a Key
  slider; seeded PRNG). Keys and hits only trigger it: each note in gets its own random note.
- Keyboards get **Silent Keys** (default off): keys stop sounding and only set what power and hits play. With no keys
  held a source plays its own note.

## Consequences
- Hold a chord and particles strum it; add an Arpeggiator and each hit plays the next note.

## Alternatives considered
- **Key + scale for Random Note, one chord type for Chord:** too few choices, and parallel chords sound wrong
  (owner, 2026-11-19).
- **A circle of notes (as funputs Orbit):** BlokDust's shapes are all 45° angles; bars fit.
- **Effects in chain order:** the user would have to place note effects first; the owner asked for no routing.
