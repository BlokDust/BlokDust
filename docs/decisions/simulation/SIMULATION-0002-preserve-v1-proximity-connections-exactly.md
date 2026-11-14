---
id: SIMULATION-0002
title: Preserve v1 proximity connections exactly, computed in the engine
status: accepted
date: 2026-11-05
domain: simulation
tags: [simulation, connections, parity]
supersedes: []
superseded_by:
---
# SIMULATION-0002: Preserve v1 proximity connections exactly, computed in the engine

## Context
Proximity connection is BlokDust's core mechanic. Blocks connect when they are within an effect's catchment (6 grid units, `Blocks/Effect.ts` and `MainScene.ts`). Users never draw cables.

## Decision
Keep v1's connection rules unchanged (see SPEC-CONNECTIONS-PROXIMITY), but compute them in the engine incrementally. Only the moved block's neighbourhood is re-evaluated, through a spatial hash, and only the affected audio chain is rewired. This replaces v1's global mute, disconnect-all and rebuild-all (`ConnectionManager.Update`).

## Consequences
- Moving a block no longer causes clicks or dropouts elsewhere. Rewiring uses short crossfades.
- The MCP layout solver (SHARING-0003) must respect catchment radii to avoid unintended connections.
