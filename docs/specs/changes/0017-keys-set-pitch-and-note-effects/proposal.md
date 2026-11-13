---
id: CHG-0017
title: Keys set pitch, and note effects (Chord, Arpeggiator, Random Note)
status: proposed
date: 2026-11-13
specs: [SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-AUDIO-V1-PARITY]
adrs: [SCOPE-0005, AUDIO-0002]
---
# CHG-0017: Keys set pitch, and note effects (Chord, Arpeggiator, Random Note)

## Why
Today a particle hitting a Tone always plays the Tone's own note, so only keyboards change pitch. The owner wants held
keys to decide what hits play, and Chord, Arpeggiator and Random Note blocks that work next to any source.

## What changes
- **Keys set pitch** on Computer Keyboard and MIDI Controller (`keysSetPitch`, default off): keys stop sounding and set
  the notes that power and hits play; with no keys held a source plays its own note. SPEC R10d gains R10e.
- **Chord** (`fx.chord`): intervals as a carousel of chord types (octave, fifth, major, minor, sus2, sus4, 7th) plus
  Inversion.
- **Arpeggiator** (`fx.arpeggiator`): Pattern (up, down, up-down, random), Rate (synced or free) or Step per hit,
  Octaves 1–3.
- **Random Note** (`fx.random-note`): Key, Scale (shared table with Grid), Low and High octave.
- Note effects act before a source's voices, in the order Random Note → Chord → Arpeggiator (AUDIO-0002).
- Designs: `tools/block-designer/proposed.json` (owner, 2026-11-13); copy each into its manifest unchanged.

## Out of scope
- A per-note editor for the Random Note pool.

## Acceptance
- `pnpm test:engine`: held chord + particle hit plays the chord; arpeggiator steps per hit; random note stays in the
  pool and is seed-stable; keys-set-pitch off keeps every existing behaviour (all existing goldens unchanged).
- `pnpm test:mpe`: per-note expression still reaches the right voices through a Chord.
- New goldens `keys-strum`, `arp-hits`, `random-note`; wasm/worklet/plugin agree.

## Risks and unknowns
- Voice count: a 4-note chord on a 9-voice source steals sooner.
