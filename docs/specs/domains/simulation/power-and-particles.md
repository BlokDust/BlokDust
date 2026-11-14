---
id: SPEC-SIMULATION-POWER-AND-PARTICLES
title: Power, particles, lasers and logic
status: draft
domain: simulation
adrs: [SIMULATION-0001, SIMULATION-0003]
updated: 2026-11-05
---
# Power, particles, lasers and logic

## Purpose
Defines BlokDust's "physics": what powers a sound source, how particles and laser beams travel and collide, and how logic blocks react, all in deterministic engine time.

## Requirements
**Power**
- **R1.** A source is *powered* while its power count > 0 (v1 `AddPower`/`RemovePower` counting). A powered audio source sounds (gate on); unpowered releases (gate off).
- **R2.** `Power` powers every connected source while connected. `Toggle` powers connected sources only while its `on` state is true. `Pulse` powers connected sources for `pulseLength` seconds (default 0.15 s, v1 `Config.PulseLength`) each time it is triggered.
- **R3.** Emitters and Lasers run when powered or when `selfPowered` is true.

**Particles**
- **R4.** A running Emitter emits one particle every `interval` seconds (v1 default `rate` 80 frames → 1.333 s at the 60 fps reference), at `angle` degrees (−90 = up), with `speed` (v1 default 3 units/frame → 180 units/s) and `range` (v1 default 600 units). Lifetime = range / speed. Counter semantics follow v1: a newly created emitter starts its counter at 0, so a self-powered emitter first fires after one interval; while unpowered the counter is primed, so an emitter fires immediately when it becomes powered.
- **R5.** Each tick, a particle collides with the topmost block (highest z) whose hit outline contains its position, excluding Emitters (but see R5b). Effects: `Void` absorbs it; `Toggle`/`Pulse` perform their logic; a source receives a **pulse** of power for `pulseLength` (0.15 s). The particle is consumed on any collision.
- **R5b.** *(v2, owner 2026-11-11, SIMULATION-0004; v1 let particles pass through emitters)* A particle that enters another Emitter (inside its hit outline now, outside it the tick before) is consumed (event `Hit` on the emitter), and that emitter fires one particle at once, whether or not it is powered. An emitter never catches particles born inside it: its own, or those of an emitter overlapping it. Tested in `test_emitter_hit.cpp`.
- **R6.** Particle size is 2 + rand(0..1) units from the patch PRNG (visual only).

**Lasers**
- **R7.** A running Laser casts a beam from its position at `angle` for `range` units (v1 default 275). The beam MUST stop at the nearest `Void` it intersects. Every source/logic block whose outline intersects the beam before that point is *hit*.
- **R8.** A newly hit source gains power while hit (continuous, not a pulse); a newly hit logic block performs its logic once; when a source stops being hit it loses that power.
- **R9.** With `rotate` ≠ 0 and running, the angle advances by `rotate` deg/s (v1: rotate/100 deg per frame → ×0.6 deg/s at 60 fps).
- **R10.** Lasers can hit and power other Emitters and Lasers (power sources are sources in v1).

**Time and determinism**
- **R10b.** A source's ADSR at gate-on: the default (A 0.01, D 0.5, S 0.5, R 0.01 s) when the gate is held by static power (Power, Toggle); otherwise the settings of the last Envelope block in its chain. This reproduces v1, where pre-effects apply after Power triggers (docs/reference/v1-audio.md). Tested in `test_audio_graph.cpp`.
- **R10c.** Holding the pointer on a source (audio source, Particle Emitter, Laser: v1 `Source` subclasses) powers it until release (v1 `Source.MouseDown/MouseUp` → `AddPower/RemovePower`), including a block just dragged out of a menu; engine command `Press`. Pressing effects, Power, Toggle or Pulse does nothing. Like a particle hit, a press uses the chain's Envelope (R10b).
- **R10d.** Sources have voices as v1 `Source` (`GetVoice`/`RemoveVoice`): voice 0 is shared by power and mono controllers (the mono voice); a connected controller with Poly on gives the source 9 voices, each key its own (none free: the oldest is stolen without retrigger). A mono key pressed while the mono voice sounds changes pitch without retriggering, gliding linearly over the controller's `glide` seconds (only when ≤ 1 voice is active); releasing the sounding key releases the voice (an older held key does not take over); if the source is powered, power takes the voice back at the default note. Disconnecting a controller releases its voices.
- **R11.** All of the above run on the engine's fixed 240 Hz tick, derived from the sample clock; trigger events carry sample offsets.
- **R12.** Same patch + seed + inputs ⇒ bit-identical event stream and audio on every platform.

## Scenarios
- **S1.** Self-powered Emitter aimed right at a Tone 10 gu away: Tone receives a 0.15 s gate every 1.333 s, first hit at a deterministic sample index.
- **S2.** Laser through Tone A, then Void, then Tone B: A is powered, B is not (R7).
- **S3.** Particle hits a Toggle connected to a Tone: Tone toggles on; next particle toggles it off.

## v1 reference
`app/Blocks/Power/ParticleEmitter.ts`, `Laser.ts`, `Power.ts`, `Logic/Toggle.ts`, `Logic/Pulse.ts`, `Void.ts`; `app/ParticleLayer.ts`; `app/LaserBeams.ts`; `app/Blocks/Source.ts` (`ParticleCollision`).
Intentional deviations: (a) frame-based timing → seconds (SIMULATION-0003); (b) v1 laser/Void handling depended on block iteration order and could power blocks *behind* a Void — v2 fixes this (R7); (c) setTimeout-based pulses → sample-accurate (R11).

## Verification
`engine/tests/test_simulation.cpp` (R1–R5 incl. Toggle, Pulse, Void, pass-through, expiry, overlapping pulses) and `test_determinism.cpp` (R11–R12: bit-identical audio + events across runs and across buffer sizes 1–4096 at 48 kHz and 44.1 kHz; the RNG seed affects visuals only). `test_lasers.cpp` covers R7–R10 (Void truncation, continuous power while hit, rotation only when powered, logic fired once per hit, lasers powering emitters/lasers). Golden audio + event hashes (`pnpm bd render --check`, 11 fixtures incl. `laser-sweep`, `busy-scene`, `toggle-pulse`) are identical on macOS (clang, dev/release/asan), Windows (MSVC x64), WASM in Node and the browser AudioWorklet, and inside the built VST3/AU (R12). Linux is wired into `bd ci --linux` but needs a Docker daemon.

## Open questions
- Should Void also block particles that pass "through" between ticks at high speed? (v2: swept collision, recommended.)
