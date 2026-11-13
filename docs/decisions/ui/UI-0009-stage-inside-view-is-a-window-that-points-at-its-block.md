---
id: UI-0009
title: Stage inside view is a window that points at its block
status: proposed
date: 2026-11-13
domain: ui
tags: [ui, stage, post-2-0]
supersedes: []
superseded_by:
---
# UI-0009: Stage inside view is a window that points at its block

## Context
Entering a Stage block (SCOPE-0006) needs an obvious sense of being inside another layer, working by touch without
instructional text. Four options were sketched on v1 frames and a phone frame (2026-11-13); the owner chose B.

## Decision
We will show the inner stage in a v1 options-panel-shaped window, above the outer stage and below the header and block
menus. On desktop and iPad the outer stage slides so the Stage block sits in a wider left margin, joined to the window
by the options-panel pointer. On a phone the block sits in a strip under the header and the pointer points down.
- In: the Stage panel's **Open stage** button, or double-click the block.
- Out: × in the window, Esc, or a click or tap anywhere outside the window (the Stage block included).
- The menus, zoom and trash act on the inner stage while it is open. The world POWER switch stays global (UI-0008).

## Consequences
- Built only from v1 panel parts; no new chrome.

## Alternatives considered
- **A: window without pointer.** **C: full stage with a path tab** (least sense of a layer). **D: side by side**
  (smallest inner stage).
