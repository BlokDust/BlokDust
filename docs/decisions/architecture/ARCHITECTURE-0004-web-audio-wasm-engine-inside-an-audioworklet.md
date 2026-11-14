---
id: ARCHITECTURE-0004
title: Web audio: WASM engine inside an AudioWorklet, MessagePort protocol, SharedArrayBuffer optional
status: accepted
date: 2026-11-05
domain: architecture
tags: [web, wasm, embed]
supersedes: []
superseded_by:
---
# ARCHITECTURE-0004: Web audio: WASM engine inside an AudioWorklet, MessagePort protocol, SharedArrayBuffer optional

## Context
SharedArrayBuffer requires cross-origin isolation (COOP/COEP). Embeds inside third-party pages (X, Reddit, ChatGPT/Claude MCP Apps) cannot rely on being isolated.

## Decision
The WASM engine runs inside an `AudioWorkletProcessor`. Commands and snapshots travel over `MessagePort` with transferable buffers. When `crossOriginIsolated` is true (main site), a SAB ring buffer may be used as an optimisation, never as a requirement.

## Evidence
CHG-0001 task 0.8: the engine builds to a 31.8 KB standalone WASM with no imports. All golden fixtures render bit-identically in Node (`pnpm bd wasm test`) and through the real AudioWorklet in headless Chromium (`pnpm test:worklet`, OfflineAudioContext). This needs `blokdust/dmath.hpp` (no libm) and a matching TS hash/patch loader.

## Consequences
- Snapshot rate is capped (~60 Hz) and snapshots are compact: particles as Float32Array, transferred.
- Embeds need a "tap to start" gesture before an AudioContext can run (browser autoplay policy).
