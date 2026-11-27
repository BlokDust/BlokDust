---
id: CHG-0048
title: Clear Stage on any scene
status: proposed
date: 2026-11-27
specs: [SPEC-VISUAL-V1-PARITY]
adrs: []
---
# CHG-0048: Clear Stage on any scene

## Why

The owner often reopens a scene and wants a blank stage, but the header's CLEAR icon (v1 `CreateNew`) was often missing. v1 showed it only at two blocks or more, and only after its hide animation had finished and the block count changed. A scene that arrived while `ResetScene` was hiding it (opening a patch, the plugin editor's reload) left it hidden until a block was added or deleted.

## What changes

- The CLEAR icon shows whenever the stage holds at least one block and hides when the stage is empty, whatever the stage held before (SPEC-VISUAL-V1-PARITY R23; owner, 2026-11-27). This differs from v1, which needed two blocks.
- The ported `CreateNew` keeps v1's drawing and tweens. Only its `CheckState` is replaced, from `web/src/v1ui/scene/createNewState.ts`.

## Out of scope

The icon's look and the confirm panel are unchanged.

## Acceptance

- `pnpm web:build && pnpm test:ui-regressions --only clear-stage,clear-stage-icon-shown,clear-and-open-clear-particles` passes: one block shows the icon; it stays shown after opening a preset over a scene, after CLEAR then OPEN, and when a scene arrives in the same frame as the reset.

## Risks and unknowns

Screenshots of one-block v1 scenes now show the icon (`bd visual diff`).
