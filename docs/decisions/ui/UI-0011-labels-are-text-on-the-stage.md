---
id: UI-0011
title: Labels are text on the stage
status: proposed
date: 2026-11-13
domain: ui
tags: [ui, stage, post-2-0]
supersedes: []
superseded_by:
---
# UI-0011: Labels are text on the stage

## Context
The owner wants notes on the stage to explain a patch. A label does not need a block shape.

## Decision
We will add labels: a line of text in v1's stage type (Dosis, the theme's text colour) with a small drag dot beside it.
Drag the dot to move it; click the text to edit; drag to the trash to delete. Labels never connect, never collide with
particles or beams and never make sound. A label is added from the Interaction menu.

## Consequences
- Patches gain a `labels` list (SPEC-PATCH-FORMAT-V2).

## Alternatives considered
- **A Label block:** would look like it does something.
