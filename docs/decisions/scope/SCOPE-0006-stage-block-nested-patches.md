---
id: SCOPE-0006
title: Stage block: a patch inside a block (macros, depth 2)
status: proposed
date: 2026-11-13
domain: scope
tags: [scope, macros, stage]
supersedes: [SCOPE-0002]
superseded_by:
---
# SCOPE-0006: Stage block: a patch inside a block (macros, depth 2)

## Context
SCOPE-0002 deferred macros (grouped blocks) until after v1 parity. Parity shipped. The owner wants a **Stage** source
block that holds a whole patch: made from selected blocks or from a shared patch, entered to edit, and running at the
same time as the stage around it.

## Decision
We will ship macros as the Stage block. A Stage holds its own **copy** of a patch (never a live link to a share,
which could change or vanish). Its audio is a source in the outer patch, so outer effects apply. Power connected to it
turns its world on; a particle hit or a held pointer is momentary power, like any source; unpowered it is silent.
Depth is limited to 2: inside a Stage, Stage is missing from the Source menu. There is no CPU limit beyond the engine's
fixed pools; users may push their machines. The bottom world POWER switch (UI-0008) stays global.

## Consequences
- The patch format's reserved `macros` key (SPEC-PATCH-FORMAT-V2 R7) carries the inner patches (CHG-0021).
- The inside view is UI-0009.

## Alternatives considered
- **Live reference to a share URL**: breaks when the share changes or is deleted.
- **Unlimited depth**: harder to show and to reason about; can come later.
