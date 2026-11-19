---
id: UI-0016
title: Note bars and a range slider in the options panel
status: proposed
date: 2026-11-19
domain: ui
tags: [ui, options-panel, note-effects, post-2-0]
supersedes: []
superseded_by:
---
# UI-0016: Note bars and a range slider in the options panel

## Context
Random Note and Chord (AUDIO-0002, CHG-0040) need a value for each of the 12 notes and Random Note needs a pitch
range. One slider per note would fill the panel, and two sliders for a range let the ends cross. Owner, 2026-11-19:
vertical bars, no circles: BlokDust's shapes are straight lines at 45° angles.

## Decision
We will add two panel rows, drawn only from v1 panel parts (no gradients, no circles):
- **Note bars:** 12 vertical bars, C to B, the note names under them (sharps). Black-key notes have v1's hatched track,
  white-key notes none; a Chord's bar also names its chord under the note. Dragging up or down sets one bar; continuous (Random Note's weights) or stepped (Chord's
  qualities). While a bar is held its value shows above the row's top-right corner, as the Envelope's held handle
  does (UI-0014): "F♯ 35%", "D MINOR". The bar of a note that plays lights up briefly.
- **Range slider:** v1's slider track with two handles, stepped by semitone; the value reads "C2 – G4". The handles
  can meet, never cross; the nearer handle takes the drag.
The bars show the pattern after the block's Key slider, so they always show what will play.

## Consequences
- LFO targets (AUDIO-0003) come from slider rows; these rows add their own entries (Random Note's weights and range
  ends), as the Filter's graph does.
- Twelve bars must fit a phone's panel; the note names may shrink there.

## Alternatives considered
- **A circle of notes (funputs Orbit):** shows scale and chord shapes, but circles don't belong in BlokDust.
- **A slider through the chord qualities per note:** the qualities have no order a slider could mean.
