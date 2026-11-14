# Performance baselines (CHG-0001 0.12)

Anonymized reference measurements. Raw local reports are saved under `.cache/perf/`. Wall-clock, best of 3, single thread. A baseline to compare future
changes against, not a gate: rerun on the same machine before and after a change.

## Engine CPU

20 s renders at 48000 Hz in 128-frame buffers (an AudioWorklet quantum; budget 2667 µs per buffer).
Native = `release` preset; WASM = the same `blokdust.wasm` the web app ships, run in Node (V8, like Chromium's AudioWorklet).
Voices are 12 cells apart so they never interact. *Powered*: Power → Tone (saw) → Filter, all sounding throughout.
*Particle*: a self-powered emitter (rate 5) firing into Tone → Filter. Phase 0 DSP only (tone, peaking filter, master
compressor); Phase 1 effects (reverb, delay, granular…) will add to these numbers.

| Scene | Blocks | Particle hits | Native µs/buffer | Native CPU | WASM µs/buffer | WASM CPU | WASM / native |
|---|---|---|---|---|---|---|---|
| empty | 0 | 0 | 0.7 | 0.03% | 1.1 | 0.04% | 1.57× |
| powered-voices-8 | 24 | 0 | 9 | 0.34% | 8.5 | 0.32% | 0.94× |
| powered-voices-32 | 96 | 0 | 23.8 | 0.89% | 26.7 | 1% | 1.12× |
| powered-voices-128 | 384 | 0 | 92.3 | 3.46% | 100.6 | 3.77% | 1.09× |
| particle-voices-8 | 24 | 1888 | 9.9 | 0.37% | 9.5 | 0.36% | 0.96× |
| particle-voices-32 | 96 | 7562 | 34.2 | 1.28% | 38.2 | 1.43% | 1.12× |
| particle-voices-128 | 384 | 30252 | 231 | 8.66% | 254.5 | 9.54% | 1.10× |

## Stage rendering (Pixi stress)

`benchmark()` in web/src/visual.ts with the shipped `canvas` renderer (UI-0005): N blocks (0 or 5 moved per frame; each move
re-renders the static layer), plus N particles updated every frame, 240 frames at 1280×800 @2x, headless Chromium on
**the reference GPU backend**. Frame time is CPU + GPU work up to `gl.finish()`, without vsync; 120 fps needs ≤ 8.3 ms. Chromium rasterises and
composites the on-page Canvas2D static layer asynchronously, so its share is only partly included; confirm in a real
browser with DevTools before relying on headroom.
"Moved" rows are the drag worst case (each move redraws the static Canvas2D layer); idle frames redraw nothing static.

| Blocks | Particles | Blocks moved / frame | Mean frame | Median frame | p95 frame | fps (median) |
|---|---|---|---|---|---|---|
| 100 | 2000 | 0 | 1.06 ms | 0.5 ms | 1 ms | 2000 |
| 100 | 2000 | 5 | 0.7 ms | 0.6 ms | 1 ms | 1667 |
| 300 | 4096 | 0 | 1.16 ms | 1 ms | 1.8 ms | 1000 |
| 300 | 4096 | 5 | 1.47 ms | 1.3 ms | 2.1 ms | 769 |
