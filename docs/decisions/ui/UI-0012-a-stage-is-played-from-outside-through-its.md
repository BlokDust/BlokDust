---
id: UI-0012
title: A Stage is played from outside through its controllers and Stage In
status: accepted
date: 2026-11-14
domain: ui
tags: [stage, controllers, selection]
supersedes: []
superseded_by:
---
# UI-0012: A Stage is played from outside through its controllers and Stage In

## Context
Owner review 2 of CHG-0021 (2026-11-14). A Stage could only be powered: Keyboards, Touchpads and MIDI Inputs outside it
did not reach the blocks inside, and a Keyboard inside it played only while the Stage was open. The owner also wanted
any selection to go into a Stage whole (samplers and the Microphone were left out, cutting their connections), and an
obvious way to make a Stage from a selection.

## Decision
We will let notes into a Stage (SPEC-SIMULATION-POWER-AND-PARTICLES R13a):
- **Keys and MIDI everywhere.** The computer's keys and MIDI in reach every Keyboard and MIDI Input, inside Stages too,
  whether or not the Stage is open.
- **Through the Stage block.** A controller touching a Stage block sends its notes in, to every controller inside:
  its Keyboards, MIDI Inputs and Touchpads, and **Stage In**, a new Interaction block offered only inside a Stage
  (a keyboard without keys: Mono/Poly, Octave, Glide; poly by default so chords stay chords). Each plays what it
  touches with its own settings; the outer controller adds its octave.
- **Make Stage.** While blocks are selected, a MAKE STAGE button under the header's right end (v1's MessagePanel
  button: a Palette[4] bar, its words in TxtMid) puts them inside a new Stage block where they were, as Cmd/Ctrl+G
  does; the new Stage is then selected.
- **Everything goes in, or nothing.** Samplers (with their audio), the Microphone and Audio In go inside like any
  block. A selection that holds a Stage cannot go in (one level, SCOPE-0006): no button, no drop ring.
- **Opening a Stage shows its blocks** (owner, 2026-11-14). The view saved with the Stage is kept while every block
  shows in the window; otherwise the view centres the blocks in the window, at the largest of v1's zoom levels (no
  larger than the saved one) that fits them all, so a Stage never opens on an empty window.

## Consequences
- The engine keeps, per Stage, the notes each outer controller holds inside, so they end on the key they started on.
- Web: inner samplers' audio is kept by the app and sent to the inner world (WASM `bd_attach_sample_stage`); MIDI
  Inputs inside Stages get Web MIDI from outside.
- The plugin plays notes into Stages (the engine does it) but does not yet attach audio to samplers inside a Stage.
- Stage In's look is a placeholder until the owner designs it in the block designer.
- Tests: `test_stage.cpp` (UI-0012 cases), `pnpm test:new-blocks --only make-stage-button,stage-keys,stage-opens-on-blocks`.

## Alternatives considered
- **The Stage as a tape** (a note re-pitches and re-times the whole inner world): one note at a time, drums move with
  the melody, and its clock leaves the outer tempo. Kept as a possible later mode.
- **Only a Stage In receives** (inner Keyboards ignore the outside): the owner wanted Keyboards inside to just work.
