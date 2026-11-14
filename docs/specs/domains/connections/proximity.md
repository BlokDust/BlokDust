---
id: SPEC-CONNECTIONS-PROXIMITY
title: Proximity connections
status: draft
domain: connections
adrs: [SIMULATION-0002, ARCHITECTURE-0002]
updated: 2026-11-05
---
# Proximity connections

## Purpose
Blocks connect by being near each other, never by cables. This spec pins v1's rules so v2 reproduces them exactly while computing them incrementally in the engine.

## Terms
- **Grid unit (gu):** block positions are integer grid coordinates. In v1 one grid cell = 15 drawing units, and 1 unit = viewport width / 850 (`Metrics.ts`). The engine works purely in gu; screen scaling is a UI concern.
- **Source-like:** audio sources (`ToneSource`, `Noise`, `Microphone`, `Sample`, `Granular`, `Recorder`, `SampleGen`, v2 `AudioIn`) and **power sources** (`ParticleEmitter`, `Laser`).
- **Effect-like:** audio effects (17 v1 effects), **power effects** (`Power`, `Toggle`, `Pulse`) and **controllers** (`ComputerKeyboard`, `MIDIController`).

## Requirements
- **R1.** A source-like block A MUST be connected to an effect-like block E iff the Euclidean distance between their positions is <= E's catchment radius (default **6 gu**, `Blocks/Effect.ts` `CatchmentArea`).
- **R2.** Power sources (Emitter, Laser) MUST connect only to power effects (Power, Toggle, Pulse) and keyboards (Computer Keyboard, MIDI Input), never to audio effects. Keyboards are beyond v1 (owner review 2 of Phase 3, CHG-0004): a held key powers the Emitter/Laser, and the newest held key aims it, the 12 notes of the octave as 12 clock positions (C = 12 o'clock, −90°; +30° clockwise per semitone); letting it go aims at the newest key still held. Every key pressed (note-on) MUST fire a connected Emitter once at that key's angle, at once, including a key pressed while others are held (legato) and several pressed together, and restarts its repeat interval (CHG-0009). While keys are held the Emitter repeats at its Rate (or synced Division): a mono keyboard at the newest key's angle, a polyphonic keyboard one particle per held key.
- **R2a.** *(v2, CHG-0015)* Gates (`Counter`, `Chance`, `Prism`) connect to nothing, like `Void`: they act only on the particles and beams that reach them (SIMULATION-0005/0006).
- **R3.** Audio sources MAY connect to any effect-like block, including power effects (that is how a Power block powers a Tone block) and controllers (a keyboard plays connected sources).
- **R4.** A source MAY connect to many effects and an effect MAY have many sources. A **chain** is a connected component of the proximity graph, excluding power-effect-like blocks (Power, Toggle, Pulse, controllers), as in v1's `AccumulativeConnectionMethod`. All audio sources in a chain sum into the chain's post effects **in series, in DFS pre-order**, then to master. A chain without post effects goes straight to master.
- **R4a.** DFS order is v1's (owner, 2026-11-12, CHG-0011): each DFS starts at the earliest-created block not yet chained (v1 `App.Blocks`), and from a block visits its neighbours **in the order they connected to it**, oldest first (v1 `Block.Connections`, appended on connect, removed on disconnect). So the effect connected last is last in the chain: Tone + Bit Crusher, then Stereo Delay, is tone → crusher → delay; take the crusher away and bring it back and it is tone → delay → crusher. Moving a block that stays connected keeps its place. A pair connected together at load connects in block order; patches save the order (`connectionOrder`, SPEC-PATCH-FORMAT-V2 R4) and loaders replay it with `Command::Relink`.
- **R5.** When a block is added, moved or removed, the engine MUST re-evaluate only the pairs involving that block (currently an O(n) scan over ≤ 512 blocks; add a spatial index if profiling demands it) and MUST NOT mute or rebuild unrelated chains. Rewiring SHOULD crossfade (≤ 10 ms) to avoid clicks: implemented (CHG-0002 1.3) as a 5 ms fade-out of only the changed chains on the old routing, the switch, then a 5 ms fade-in; unchanged chains are bit-identical (`test_audio_graph.cpp`).
- **R6.** Connection lines MUST be drawn between connected pairs exactly as v1 draws them (thin palette-coloured line, `UI/ConnectionLines.ts`).
- **R7.** Connections are derived state and MUST NOT be stored in patches. Only their order is (R4a).

## Scenarios
- **S1.** Given a Tone at (0,0) and Filter at (4,-2) (distance 4.47 gu), then they are connected (R1). Fixture: `tests/visual/fixtures/v1/proximity-chain.json`.
- **S2.** Given a Noise at (-10,5) and Reverb at (-6,8) (distance 5 gu), then they are connected.
- **S3.** Given an Emitter within 6 gu of a Reverb, then they are NOT connected (R2).
- **S4.** Given a connected Tone/Filter, when the Filter is dragged to distance 6.1 gu, then the connection is removed and only that chain is rewired (R5).
- **S5.** Given a Computer Keyboard connected to an Emitter, when C is held and E is then pressed, then a second particle fires at once towards 4 o'clock; letting E go aims the Emitter back at 12 o'clock (R2, CHG-0009).
- **S6.** Given a polyphonic Computer Keyboard connected to an Emitter, when C, E and G are pressed together, then three particles fire at once (12, 4 and 7 o'clock), and while held the three repeat together at the Emitter's Rate (R2, CHG-0009).
- **S7.** Given a Tone with a Bit Crusher connected, then a Stereo Delay, when the crusher is moved away and back, then the chain is tone → delay → crusher, and a patch saved then reopened keeps that order (R4a).

## v1 reference
`app/MainScene.ts` (catchment check loop, ~L525), `app/Core/Audio/Connections/ConnectionManager.ts`, `app/Blocks/Effect.ts`.
Intentional deviation: v1 muted master and rebuilt every chain after a 35 ms timeout on any change; v2 rewires incrementally (R5).

## Verification
- `engine/tests/test_connections.cpp`: R1–R5 including inclusive boundary, kind rules, scheduled moves, removal, chain DFS order, and a 400-step randomised check that incremental updates always equal a full O(n²) rebuild.
- Visual parity: v1 vs v2 screenshots of connection fixtures (R6).
- Black-box: Playwright drags a block across the catchment boundary and asserts connection events + no master dropout (R5).

## Deviations from v1 (intentional)
- (Withdrawn 2026-11-12, CHG-0011.) Neighbour order used to follow block creation order; it follows connection order again, as in v1 (R4a). It stays deterministic: the order is saved with the patch.

## Open questions
- Should users be able to see or reorder effect order in a chain? (v1 had no UI for it.)
