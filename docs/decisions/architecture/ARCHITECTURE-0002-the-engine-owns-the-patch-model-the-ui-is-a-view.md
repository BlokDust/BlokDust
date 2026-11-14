---
id: ARCHITECTURE-0002
title: The engine owns the patch model; the UI is a view that sends commands
status: accepted
date: 2026-11-05
domain: architecture
tags: [engine, ui, plugin]
supersedes: []
superseded_by:
---
# ARCHITECTURE-0002: The engine owns the patch model; the UI is a view that sends commands

## Context
DAWs load and render plugins with the editor window closed. Every behaviour must therefore work without a UI: proximity connections, power, particles, lasers and sequencing. v1 mixed model, view and audio in one class (`Blocks/Block.ts`, `Blocks/Source.ts`).

## Decision
The engine holds the authoritative patch state and derives connections from it. The UI sends **commands** (add/move/remove block, set param, transport) and receives **snapshots/events** (block state, particle positions, beams, meters). Undo/redo is implemented over commands.

## Consequences
- The protocol between engine and UI is a versioned, schema-defined message set, shared by WASM and the plugin bridge.
- The UI can be tested headlessly against a mocked or real engine. Engine behaviour can be tested without any UI.
- UI-only state (selection, hover, camera) stays in the UI.
