---
id: ARCHITECTURE-0001
title: Portable C++20 engine with no framework dependency
status: accepted
date: 2026-11-05
domain: architecture
tags: [engine, wasm, juce]
supersedes: []
superseded_by:
---
# ARCHITECTURE-0001: Portable C++20 engine with no framework dependency

## Context
The same audio and simulation must run in the browser (WebAssembly), in DAW plugins and in a standalone app, and must give the same results everywhere. JUCE does not target WebAssembly.

## Decision
`engine/` is plain C++20 with no JUCE, no OS APIs and no allocation or locks on the audio thread. It compiles with Emscripten for web and natively for the plugin and headless tools. JUCE appears only in `plugin/`.

## Consequences
- DSP building blocks come from permissively licensed libraries (e.g. Signalsmith DSP, DaisySP), from our own code, or are ported from the Tone.js algorithms v1 used, to keep its sound.
- A native headless renderer (CLI) shares the code. It powers golden-audio tests, previews and the MCP `render_preview` tool.
- The plugin shell can be swapped (JUCE / CLAP / iPlug2) without touching the engine.

## Alternatives considered
- **JUCE everywhere**: no supported WebAssembly target.
- **Keep Web Audio on web, C++ for the plugin**: two engines that drift apart, with no determinism across platforms.
- **Rust core**: viable, but the owner is fluent in C++, JUCE is C++, and the audio C++ ecosystem is deeper.
