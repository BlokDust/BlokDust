# Architecture overview

> Status: target architecture, validated by CHG-0001 spikes. Decisions are recorded in [docs/decisions](../decisions/README.md); this page explains how they fit together.

## The system in one picture

```
                         blocks/*.block.json  (single source of truth: params, geometry, behaviour, docs)
                                  │  pnpm bd codegen
             ┌────────────────────┼─────────────────────────────┬───────────────────────┐
             ▼                    ▼                             ▼                       ▼
   engine/ (C++20, no JUCE)   web/ (TypeScript)            schema/ (JSON Schema)    docs + /library page
   ├ model: patch, blocks     ├ stage: PixiJS v8            patch.v2, blocks         MCP tool schemas
   ├ connections (proximity)  ├ chrome: header, panels
   ├ sim: 240 Hz fixed tick   ├ entries: app | player | plugin
   ├ dsp: blocks, voices      └ transport: Wasm | Host
   └ io: commands/snapshots
        │            │                      │
        │ native     │ Emscripten           │ same bundle
        ▼            ▼                      ▼
   plugin/ (JUCE 8)  AudioWorklet ◀─MessagePort─▶ web app / embed / MCP App iframe
   VST3·AU·AUv3·SA   (web)
   + WebView editor ─────────────────────▶ web/ plugin entry (HostEngineTransport)

   tools/render (native/WASM headless) → golden audio, previews, MCP validate_patch
   server/ (Cloudflare Worker + D1)    → save/load/oembed/freesound proxy/MCP endpoint
```

## Responsibilities

| Layer | Owns | Never does |
|---|---|---|
| **engine** | Patch state, proximity graph, simulation, DSP, voices, undo-able command application, snapshots | Drawing, DOM, networking, file dialogs |
| **web stage** | Drawing blocks/particles/beams/lines from snapshots, hit-testing for pointer input, camera | Deciding connections, timing, or audio |
| **web chrome** | Menus, options panels, share, settings (v1 look) | Business rules |
| **plugin** | Host I/O, MIDI, tempo/transport, state save/restore (patch JSON), WebView bridge | Any BlokDust logic |
| **server** | Immutable patch storage, oEmbed, OG pages, Freesound proxy, MCP | Storing audio |

## Data flow

1. **Input**: pointer → stage hit-test → `MoveBlock{id,x,y}` command → transport.
2. **Engine** applies commands at the start of an audio block, updates the spatial hash, re-evaluates nearby connections (SPEC-CONNECTIONS-PROXIMITY R5), rewires affected chains with crossfades.
3. **Sim** advances in 240 Hz ticks inside `process()`. Collisions produce gate events with sample offsets → voices.
4. **Snapshots** (~60 Hz): changed block states, particle buffer (Float32Array: x, y, size), beams, power states, meters → UI interpolates and draws.

## Determinism contract
Seeded PRNG per patch, fixed tick, no wall-clock reads in engine, no fast-math in sim, canonical patch serialization. The same patch renders bit-identically in WASM and native; CI checks this on 3 OSes. This is what makes golden tests, embeds, previews and MCP validation trustworthy.

## Surfaces
| Surface | Entry | Engine transport | Notes |
|---|---|---|---|
| Website `blokdust.funputs.com` | `app` | WASM in AudioWorklet | Optional SAB when cross-origin isolated |
| Embed `/embed/<id>` | `player` | WASM | Tap-to-start; no SAB; oEmbed + OG |
| MCP App (Claude/ChatGPT) | `player` | WASM | Playback only |
| Plugin VST3/AU/AUv3/Standalone | `plugin` | JUCE native via WebView bridge | Works with editor closed |

## Where things live
```
engine/      C++ core (+ tests)          plugin/   JUCE shell
web/         TS UI (app/player/plugin)   server/   Cloudflare Worker + D1
blocks/      block manifests             schema/   generated JSON Schemas
tools/       bd CLI tools (registry)     tests/    visual, e2e, golden, fixtures
docs/        architecture, decisions, engineering, plans, reference, specs
```
