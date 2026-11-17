---
id: UI-0014
title: The Envelope graph uses a curved time axis
status: accepted
date: 2026-11-17
domain: ui
tags: [ui, options-panel, envelope, post-2-0]
supersedes: []
superseded_by:
---
# UI-0014: The Envelope graph uses a curved time axis

## Context
The owner (2026-11-17) finds short attacks hard to set on the Envelope's graph. v1's ADSR row
(`ported/UI/Options/OptionADSR.ts`, built in `OptionsPanel.Populate`) puts attack and decay on 28 % of the panel and
release on 40 %, each a straight line from 10 ms to 5 s. On a desktop panel that is ~150 px for 5 s, so the whole
10–100 ms range (where percussive attacks live) is under 3 px. v1 also moved a handle to the pointer on press (a
small offset jumps the value), and a press where handles overlap grabbed all of them. The panel is v1's code, ported
verbatim, and must not be edited by hand.

## Decision
We will place the Envelope's time handles on a curved axis, applied around v1's panel in `web/src/v1ui/adsrPanel.ts`:
a log axis by default (10 ms → 5 s, each tenfold step the same width), with the graph drawn by v1's own code on those
positions. A held handle follows the pointer from where it was grabbed (Shift: a tenth as fast), a press takes only the
nearest handle, and the held value is written just above the graph's top-right corner in the title's type. The owner tried log,
squared and straight axes on staging (2026-11-17) and picked log; the others were removed.

## Consequences
- Short times get most of the room: on the log axis 10–100 ms is 37 % of the track, 1 s sits at 74 %.
- The graph no longer pictures time linearly: a 1 s attack looks wider than in v1. The shape (rise, fall, sustain
  plateau, release) is unchanged, and the readout gives the real value.
- Patches and the engine are unchanged: the axis is only how handle positions map to the same parameter values.

## Alternatives considered
- **Squared axis** (`?adsr=square`): gentler (1 s at 45 %), closer to v1's picture, but 10–100 ms still gets only
  ~13 %. Tried on staging; not picked.
- **v1's straight axis with fine-drag only**: keeps v1's picture; relies on Shift (no keyboard on touch devices).
  Tried on staging; not picked.
- **Typed values / a numeric field**: precise, but not in v1's visual language and clumsy on touch.
