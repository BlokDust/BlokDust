---
id: AUDIO-0003
title: LFOs modulate one param and add up
status: proposed
date: 2026-11-13
domain: audio
tags: [audio, modulation, post-2-0]
supersedes: []
superseded_by:
---
# AUDIO-0003: LFOs modulate one param and add up

## Context
The owner wants an LFO that connects to any block, including power blocks, and modulates a parameter chosen from a
carousel of the connected blocks' parameters.

## Decision
We will add an LFO effect block that targets **one block and one param**, chosen from a carousel labelled
"Block · Param" listing the params of the blocks connected to it. Modulation is applied in the engine at tick rate in
the param's slider space (its curve), so depth means the same on every param. Several LFOs on one param **add**; the
sum is clamped to the param's range (angles wrap). Shapes: sine, triangle, square, saw; rate free or synced; depth;
phase.

## Consequences
- The open panel's slider shows the moving value (as Dust automation, CHG-0012).
- Saved patches keep the unmodulated value; the LFO is in the patch, so playback is identical.

## Alternatives considered
- **One param name across all connected blocks:** less predictable; can come later.
