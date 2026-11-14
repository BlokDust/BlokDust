---
id: PLUGIN-0002
title: Ship instrument and effect variants; the effect starts with an Audio In block
status: accepted
date: 2026-11-05
domain: plugin
tags: [plugin, blocks]
supersedes: []
superseded_by:
---
# PLUGIN-0002: Ship instrument and effect variants; the effect starts with an Audio In block

## Context
BlokDust generates sound (self-playing environments) and can also process sound (v1's Microphone block fed effects).

## Decision
Build two plugin variants from one codebase:
- **BlokDust** (instrument): MIDI in, stereo out. Keyboard/MIDI blocks receive host MIDI.
- **BlokDust FX** (effect): audio in and out. New patches start with an **Audio In** source block carrying the track's audio. It behaves like v1's Microphone block and connects to effects by proximity.

## Consequences
- New block `source.audio-in`. On the web it maps to the microphone or line input. It uses the Microphone visual unless the design library defines a variant.
- Owner review 2 (2026-11-08): **Audio Input is a true bypass.** Audio In, and in the plugins v1's Microphone
  (labelled Audio Input, `EngineConfig::hostInput`), carry the host input in stereo at unity × `gain`. Their chain
  skips v1's master compressor and master volume (its other sources take the master volume before the chain's
  effects), so an Audio Input alone passes the track through bit-identically. Both blocks have one Gain row (dB,
  −40 = off, up to +6). The website's Microphone keeps v1's level and mono sum.
- Simulation timing follows host tempo and transport (SIMULATION-0003).
