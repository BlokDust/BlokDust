---
id: SCOPE-0005
title: The post-2.0 block set
status: proposed
date: 2026-11-13
domain: scope
tags: [scope, blocks, post-2-0]
supersedes: []
superseded_by:
---
# SCOPE-0005: The post-2.0 block set

## Context
After 2.0 shipped with v1's 32 blocks, the owner reviewed ideas for new blocks (2026-11-13), drawing on modular
systems (Max/MSP, Ableton Push). SCOPE-0004 allows new blocks when they are additive and pass the design library rules
(UI-0003). This ADR records which ones are in, so each change proposal does not re-argue it.

## Decision
We will add these blocks, each designed by the owner in `pnpm bd block-designer` and kept in
`tools/block-designer/proposed.json`:

| Block | Menu | Change |
|---|---|---|
| Compressor | Effect | CHG-0014 |
| Counter, Chance, Prism | Power | CHG-0015 |
| Gate | Power | CHG-0032 |
| Sound Laser | Power | CHG-0016 |
| Chord, Arpeggiator, Random Note | Effect | CHG-0017 |
| LFO | Effect | CHG-0018 |
| Touchpad | Interaction | CHG-0019 |
| Stage | Source | CHG-0021 |

Labels (CHG-0020) are text on the stage, not a block. Emitter Offset (CHG-0014) and Keys set pitch (CHG-0017) are
settings on existing blocks.

## Consequences
- Old patches are unaffected: every addition is a new block type or a setting whose default keeps today's behaviour.
- New blocks have no v1 reference, so their visual and audio tests are v2 baselines, not v1 diffs.

## Alternatives considered
- **Mirror** (reflects at its face angle): replaced by Prism, which takes an exit angle and can split.
