---
id: UI-0003
title: A generated block design-system library page
status: accepted
date: 2026-11-05
domain: ui
tags: [ui, design-system, blocks]
supersedes: []
superseded_by:
---
# UI-0003: A generated block design-system library page

## Context
New blocks (including new physics blocks) must match v1's visual language: palette roles, isometric faceted polygons on the grid, outlines that double as hit areas.

## Decision
`/library` is a generated page showing every block from its manifest, in every colour theme, at several zoom levels, with its states (idle, powered, selected) and hit outline. It is also a visual test fixture. Every block, new or ported, must appear there and pass the design-rule linter: grid-aligned vertices, palette-role colours only, outline matches sprite bounds.

## Consequences
New blocks are reviewed visually on one page before they reach the stage.
