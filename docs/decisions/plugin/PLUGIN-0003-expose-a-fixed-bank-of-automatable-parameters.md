---
id: PLUGIN-0003
title: Expose a fixed bank of automatable parameters mapped onto block params
status: accepted
date: 2026-11-05
domain: plugin
tags: [plugin, automation, midi]
supersedes: []
superseded_by:
---
# PLUGIN-0003: Expose a fixed bank of automatable parameters mapped onto block params

## Context
DAWs read a plugin's parameter list once, when the plugin loads, and build automation lanes from it. VST3 and AU can technically rename or add parameters later, but hosts handle this inconsistently: lanes vanish, automation lands on the wrong parameter, or the project needs reloading. BlokDust patches add and delete blocks constantly, so "one host parameter per block slider" cannot work. The owner wants automation kept simple.

## Decision
Expose **8 fixed host parameters**, *Dust 1–8*, plus nothing else.
- Each slot holds 0–1 and is **assigned** to at most one block parameter by right-clicking a slider in a block's options panel, then choosing *Assign to Dust N*. The slot maps 0–1 onto that parameter's range and curve from its manifest.
- Where the host supports renaming, the slot shows its target (`Dust 3 · Filter cutoff`). Otherwise the assignment is shown inside BlokDust.
- Assignments live in the patch (`automation: [{ slot: 3, block: "b7", param: "cutoff" }]`), so they work on the web too, where MIDI CC can drive the same slots later.
- If the block is deleted, the slot becomes unassigned; the DAW lane stays but does nothing.

## Consequences
- Simple mental model, the same as Ableton's eight Rack macros or Bitwig's remote controls, and it never breaks a DAW project.
- Not supported: automating every slider, or automating block positions. Moving blocks changes proximity connections, which would make automation non-obvious.
- MIDI CC learn (web and plugin) can reuse the same slot table later.

## Alternatives considered
- **No automation:** simplest, but loses a key DAW workflow.
- **Dynamic parameter list:** unreliable across hosts.
- **Hundreds of pre-declared hidden parameters:** clutters every DAW's automation menu.
