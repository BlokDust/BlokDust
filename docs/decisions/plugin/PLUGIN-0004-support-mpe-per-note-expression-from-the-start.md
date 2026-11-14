---
id: PLUGIN-0004
title: Support MPE per-note expression from the start
status: accepted
date: 2026-11-07
domain: plugin
tags: [midi, mpe, engine, plugin, web]
supersedes: []
superseded_by:
---
# PLUGIN-0004: Support MPE per-note expression from the start

## Context
The owner wants expressive controllers, including Funputs (their own project), to drive BlokDust per note: tones,
samples and grains that bend, swell and change timbre under each finger. MPE (MIDI Polyphonic Expression) carries that
over MIDI 1.0 by giving every sounding note its own channel. Adding per-note expression after the engine and MIDI
layers are built would mean reworking voices, the command protocol and golden fixtures.

## Decision
- **The engine owns per-note expression** (ARCHITECTURE-0002). Each voice keeps bend in semitones (±48 by default,
  per-zone overrides allowed), pressure (0–1) and slide (CC74, 0–1). New engine commands carry note expression. The
  engine reads them at a fixed tick, so renders stay deterministic and identical on every target.
- **One MPE parser** (TypeScript for the web, C++ for the plugin, tested on the same recorded streams). It handles the
  MPE Configuration Message (RPN 6), lower and upper zones, master-channel messages applying to every note in the zone,
  and plain MIDI as a fallback (channel pitch bend and aftertouch apply to all notes).
- **Mapping per block, with defaults** (owner, 2026-11-07): pressure sets the note's volume. Slide sets brightness on
  Tone, grain position on Granular and sample start on Sample. Each block can change these.
  Pressure swells a note from its velocity's level to full, gliding over about 5 ms. A light touch
  is never silent, and the strike is heard before the first pressure message. Pressure belongs to its note: a
  channel's next note does not inherit it, while slide and bend, sent before a note, do carry over. (Owner review in
  Logic, 2026-11-07.)
  Owner review 3 (Ableton, 2026-11-08): MPE was much quieter than plain MIDI, even at full velocity. A MIDI Input
  note now starts at 0.2 + 0.8 × velocity² in both modes (1 at full velocity, never silent); MPE pressure swells it
  from there to full, and with pressure mapping off velocity alone sets it. The Computer Keyboard keeps v1's fixed
  level.
- **MIDI Input block:** an MPE switch, with the zone detected automatically from the configuration message. Channel is
  Omni or 1–16. On the web the block also chooses a device; in a DAW the track picks the device.
- **Sources:** Web MIDI on Chromium (a virtual port such as IAC for Funputs), the DAW's MIDI in the plugin, and the
  Standalone app's devices.

## Consequences
- Golden fixtures can carry recorded MPE performances, and must hash the same across native, WASM, the AudioWorklet
  and the plugin.
- Safari has no Web MIDI, so MPE on Safari works only through the plugin.
- MIDI 2.0 per-note controllers can later map onto the same voice expression without changing patches.
