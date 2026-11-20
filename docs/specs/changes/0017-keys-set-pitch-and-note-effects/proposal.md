---
id: CHG-0017
title: Silent Keys, and note effects (Chord, Arpeggiator, Random Note)
status: proposed
date: 2026-11-13
specs: [SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-AUDIO-V1-PARITY]
adrs: [SCOPE-0005, AUDIO-0002]
---
# CHG-0017: Silent Keys, and note effects (Chord, Arpeggiator, Random Note)

## Why
Today a particle hitting a Tone always plays the Tone's own note, so only keyboards change pitch. The owner wants held
keys to decide what hits play, and Chord, Arpeggiator and Random Note blocks that work next to any source.

## What changes
- **Silent Keys** on Computer Keyboard and MIDI Controller (`keysSetPitch`, default off): keys stop sounding and set
  the notes that power and hits play; with no keys held a source plays its own note. SPEC R10d gains R10e.
- **Chord** (`fx.chord`): a carousel of chord types (fifth, major, minor, sus2, sus4, seventh, major 7th,
  minor 7th) plus Inversion.
- **Arpeggiator** (`fx.arpeggiator`): Pattern (up, down, up and down, random), **Speed** (owner: how fast it moves
  between the held notes; musical lengths with Tempo Sync, notes a second without), or Per Hit (each hit plays the
  next note), Octaves 1–3.
- **Random Note** (`fx.random-note`): Key, Scale (shared table with Touchpad), Low and High octave.
- Note effects act before a source's voices, in the order Random Note → Chord → Arpeggiator (AUDIO-0002, owner
  confirmed). A source with one in its chain, or with a Keys-set-pitch keyboard, is "arranged" (SPEC R10e–R10h);
  every other source keeps v1's voice rules exactly.
- Designs: `tools/block-designer/proposed.json` (owner, 2026-11-13); copy each into its manifest unchanged.

## Out of scope
- A per-note editor for the Random Note pool.

## Acceptance
- `pnpm test:engine`: held chord + particle hit plays the chord; arpeggiator steps per hit; random note stays in the
  pool and is seed-stable; keys-set-pitch off keeps every existing behaviour (all existing goldens unchanged).
- Per-note bend through a Chord: `test_note_effects.cpp` ("per-note bend reaches every note of that key's chord").
- `pnpm test:new-blocks --only keys-set-pitch,note-effects`.
- New goldens `keys-strum`, `arp-hits`, `random-note`; wasm/worklet/plugin agree.

## Risks and unknowns
- Voice count: an arranged source has 9 voices; more notes than that are dropped (the lowest-numbered win).
- An arranged source has no glide, and a keyboard's key held while a note effect is moved in or out is dropped.

## Owner review 1 (2026-11-14)
- Chord: no Octave type (an inversion lost the bass note). The types are Fifth … Minor 7th; saved values shifted down by one (unreleased).
- A slide on a held key (Touchpad, MPE bend) moves that key for the note effects: an Arpeggiator plays the note slid to.
- Every particle hit strikes again (SIMULATION-0008), so fast particles through a Random Note pick a new note each time.
