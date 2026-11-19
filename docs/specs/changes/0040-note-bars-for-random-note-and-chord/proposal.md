---
id: CHG-0040
title: Note bars for Random Note and Chord
status: proposed
date: 2026-11-19
specs: [SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-PATCH-FORMAT-V2]
adrs: [AUDIO-0002, AUDIO-0003, UI-0016]
---
# CHG-0040: Note bars for Random Note and Chord

## Why
Random Note can only pick from a key and a scale, and Chord plays the same chord on every note, so a melody played
through it moves in parallel chords and sounds wrong. Random Note also fights the keyboard: with keys held it picks
among them (a chord played by hand flickers between its keys) and a polyphonic keyboard sounds one note. Owner,
2026-11-19: give both blocks a row of 12 bars, one per note, plus a Key slider; Random Note's keys only trigger.

## What changes
1. **Note bars** (UI-0016): a panel row of 12 vertical bars, C to B, drawn from v1 panel parts (straight lines and
   45° angles only, no circles, no gradients). Black-key notes are a darker shade. While a bar is dragged its value
   shows above the row's top-right corner, as the Envelope does ("F♯ 35%", "D MINOR"). The bar of a note that
   plays lights up briefly.
2. **Key slider** on both blocks (C…B, stepped): it slides the whole bar pattern sideways. The bars always show what
   will play; a bar edited while Key is D is stored relative to the key, so changing Key again carries the edit.
3. **Random Note** (SPEC-SIMULATION-POWER-AND-PARTICLES R10h):
   - 12 weights, 0–100%; defaults: C major (white notes 100%, black notes 0%).
   - **Range**: one slider with two handles, by semitone, C1…B7 (MIDI 24…107), default C4–B4 (60…71), shown as
     "C2 – G4"; the handles can meet, never cross.
   - Every note in the range is a candidate, weighted by its note's bar; one is drawn from the block's seeded stream.
   - Keys, MIDI notes, hits and power only **trigger**: each note in gets its own random note, picked when it starts
     and again at each trigger (R5e); the key's pitch is ignored, its velocity and per-note expression are kept.
     Three keys held on a polyphonic keyboard sound three random notes, each released with its own key.
   - All weights 0, or no weighted note in the range: the note in plays unchanged.
4. **Chord** (R10f):
   - 12 stepped bars, bottom to top: None (the note plays alone), Sus2, Minor, Major, Sus4, Minor 7th, 7th,
     Major 7th. Each note in plays the chord set on its own bar.
   - Defaults: C Maj, C♯ Maj7, D m7, E♭ Maj, E m, F Maj7, F♯ Maj7, G 7, A♭ Maj7, A m7, B♭ Maj, B m.
   - **Smooth** switch (default on) replaces Inversion: the note played stays put; each other chord note goes to the
     octave closest to the previous chord's notes, within an octave of the note played. The first chord (and every
     chord with Smooth off) is in root position. With several keys held, a new chord leads from the newest one.
5. **LFO targets** (AUDIO-0003): Random Note's 12 weights, its range ends and Key; Chord's Key. Chord's quality
   bars are not targets.
6. **Saved patches** (SPEC-PATCH-FORMAT-V2): no load-time conversion. A tool, `pnpm bd patches migrate`, rewrites
   every stored revision in D1 (blocks and Stage macros): key + scale → weights, octave low/high → semitones,
   `chord` → the same quality on all 12 bars, `inversion` dropped and Smooth off (so a migrated Chord keeps its root-position voicing). Dry run and a
   D1 export first; staging, then production. Patches kept only in a browser, a DAW project or the iPad fall back to
   the defaults (owner: fine, nothing has been shared yet). Plugin parameter IDs change (owner: fine).

## Out of scope
- Load-time conversion of old patches; keeping old plugin automation.
- LFO on Chord's quality bars.

## Acceptance
- Mock-up screenshots (desktop + phone) of the note bars, the range slider and the drag label, approved by the owner
  before engine work.
- `pnpm test:engine`: `test_note_effects.cpp` cases for R10f/R10h, including a failing-first test that three keys
  held on a polyphonic keyboard through Random Note sound three notes.
- `pnpm bd render --check --configs release,dev` with `golden-update:` lines for the changed fixtures;
  `pnpm bd wasm test`, `pnpm test:worklet`.
- `pnpm test:ui-regressions`: dragging a bar, the label, Key shifting the bars, the range handles, the light-up.
- `pnpm bd patches migrate --dry-run` against staging lists every converted block; after the run, the owner's
  patches open with the same notes.
- `pnpm bd plugin test`, `pnpm bd plugin deploy`, iPad build; staging deploy and smoke.

## Risks and unknowns
- Twelve bars plus their labels must fit the panel on a phone.
- Smooth voicing depends on the previous chord, so its state must reset with the source (R10e "changing over starts
  clean") to stay deterministic.
