---
id: CHG-0035
title: "Playtest tweaks: tour, menu order, hints, microphone power, SampleGen sound"
status: proposed
date: 2026-11-17
specs: [SPEC-VISUAL-V1-PARITY, SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-SHARING-VIDEO-EXPORT, SPEC-SHARING-GALLERY]
adrs: [SCOPE-0004, PLUGIN-0002]
---
# CHG-0035: Playtest tweaks: tour, menu order, hints, microphone power, SampleGen sound

## Why
The owner played the combined review build (PR #13) and listed fourteen small things: wording, order, a missing v1
feature (the tour), a microphone that played without power, a SampleGen that could only roll random waves, and a few
layout fixes in the Settings and Patches panels.

## What changes
- **Splash** (SPEC-VISUAL-V1-PARITY R14): the BLOKDUST 2 title fits a phone held upright (at most 80% of the width).
- **Menu order** (R13): Sources, Powers and Interactions in the owner's order (most used first); Effects alphabetical.
- **Tour** (R12): v1's Tutorial and TutorialHotspots ported verbatim; a first visit is asked once; Settings › TOUR
  row; the last step in the owner's words (PATCHES, SAVE and ADD TO GALLERY).
- **SampleGen** (R17): a SOUND slider (1–999) in place of GENERATE WAVE; each number is one wave, always the same.
- **Hints** (R13): every block's ? hint is its manifest description; the owner's new words for Granular, Sample,
  Stage, Wavetable, Compressor, Filter, LFO, Random Note, Particle Emitter, Sound Laser, Prism, Label, MIDI
  Controller, Touchpad. Counter, Chance and Gate's are on `feat/counter-gate`, where those blocks' current behaviour is.
- **Microphone** (SPEC-SIMULATION-POWER-AND-PARTICLES R1a): the website's Microphone is muted until power, a key or
  a hit plays it, as v1's was. The plugins' Audio Input stays always on (PLUGIN-0002). Trashing the last block that
  listens lets the microphone go, so the browser stops showing it in use.
- **MAKE VIDEO** hidden and off (SPEC-SHARING-VIDEO-EXPORT R15); `?video=1` shows it.
- **SAVE copies the link** (R16): LINK COPIED on the button, no second click.
- **Gallery**: room between the list and its sorts.
- **Settings** (R15): DOWNLOAD and ACCOUNT as wide as ABOUT; About without Twitter names, the websites level.

Owner's second round (2026-11-17, after trying staging):
- SampleGen's SOUND number always shows; the wave is made on release (R17).
- The tour turns the world's power on (R12).
- SAVE / SHARE › SIGN IN when signed out, back to SAVE after (R20).
- OPEN and GALLERY lists: whole rows and a half, no gap under the search rule, the last row not cut off, SHOW MORE
  (SPEC-SHARING-GALLERY R13).
- ALL TIME TOP in place of TUTORIALS (SPEC-SHARING-GALLERY R7, R13); the API keeps `tutorials`.
- Arpeggiator and Chord hints in the owner's words.
- Patches' tabs slide like Settings' (R19).
- Zoom out to 0.15 (R18).

## Out of scope
- Choosing the microphone device on the web (owner question 7): answered, not built.
- Renaming Volume to Gain (owner question 9): answered, not changed.

## Acceptance
- `pnpm test:ui-regressions`: menus-in-owner-order, menu-hints-in-owner-words, microphone-needs-power-and-lets-go,
  sample-gen-sound-slider, save-copies-link, make-video-hidden, settings-pages-as-wide-as-about,
  splash-title-fits-phone and tour pass (each fails on review/combined e8101f3).
- `pnpm test:engine`: "the website's Microphone is silent until it is powered" passes (fails without the fix).
- `pnpm check`, `pnpm bd render --check --configs release,dev`, `pnpm bd wasm test`, `pnpm test:worklet` pass.

## Risks and unknowns
- Patches that relied on an unpowered website Microphone go quiet until powered (as in v1).
- The clipboard copy after a save relies on a ClipboardItem promise in the press; a browser that refuses it shows SAVED.
