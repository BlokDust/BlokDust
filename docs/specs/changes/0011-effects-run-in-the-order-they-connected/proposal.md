---
id: CHG-0011
title: Effects run in the order they connected
status: proposed
date: 2026-11-12
specs: [SPEC-CONNECTIONS-PROXIMITY, SPEC-PATCH-FORMAT-V2]
adrs: [SIMULATION-0002]
---
# CHG-0011: Effects run in the order they connected

## Why
Owner (2026-11-12): in v1 the effect connected last goes to the end of the chain. Tone + Bit Crusher, then Stereo
Delay, is tone → crusher → delay; take the crusher away and bring it back and it is tone → delay → crusher, which sounds
quite different. v2 ordered a chain by block creation order (a recorded deviation), so the order never changed.
SIMULATION-0002 asks for v1's connections exactly.

## What changes
- SPEC-CONNECTIONS-PROXIMITY R4a: the engine records when each pair connected (`ConnectionGraph::since`). The chain DFS
  visits a block's neighbours oldest connection first (v1 `Block.Connections`). DFS starts stay in creation order (v1
  `App.Blocks`). The deviation is withdrawn.
- SPEC-PATCH-FORMAT-V2 R4: patches save `connectionOrder` (pairs, oldest first), which is ordering only. Both loaders
  replay it with a new `Command::Relink`, and `Engine::connections()` lists pairs oldest first for the UI.
- Web: the patch's order follows the engine's snapshots, and saves, shares and autosaves carry it. Open and start-up
  replay it.
- Plugin: the editor sends the order to the processor (`bd_connectionOrder`), so the DAW project keeps it. Opening a
  patch file replays it.

## Out of scope
- A UI to see or reorder the chain (v1 had none).

## Acceptance
- `pnpm test:engine`: "R4a …" cases. They fail with creation-order visiting.
- `pnpm test:ui-regressions --only effect-order`: the owner's steps, then save and reopen.
- `pnpm bd render --check --configs release,dev`: 21/21. Earlier goldens are unchanged, and the new `chain-order` golden
  sounds different without its `connectionOrder`. `pnpm bd wasm test`: the TS and C++ loaders agree.

## Risks and unknowns
- Plugin Insert: pairs between inserted and existing blocks count as older than the scene's saved pairs when the engine
  is rebuilt. This only matters if an insert lands on an existing chain.
