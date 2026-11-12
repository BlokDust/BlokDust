# Testing strategy

Everything an agent changes must be provable without a human (PROCESS-0004). The layers:

## 1. Engine unit tests (C++, Catch2)
Table-driven tests per spec requirement (`// SPEC-CONNECTIONS-PROXIMITY R1`). Run natively; a subset also runs under WASM in Node.

## 2. Golden event streams and audio
Fixtures live in `tests/golden/*.json` (patch v2 + optional timeline `script`); expected results in `tests/golden/expected/`. `pnpm bd render --check --configs release,dev` must pass. Engine maths uses `blokdust/dmath.hpp` instead of libm so hashes do not depend on the platform's maths library.

`bd render` plays fixture patches for N seconds offline and outputs:
- an **event log** (tick, sample offset, block, event): compared **exactly** (hash);
- a **WAV**: compared by hash for determinism (same build) and by tolerance (spectral/RMS) across DSP changes;
- **descriptors** (loudness, spectral centroid, onset density): used by MCP `validate_patch` and as sanity checks.

Reference updates require an explicit `--update` and a commit line `golden-update: <reason>`.

## 3. Visual parity (SPEC-VISUAL-V1-PARITY)
- References: `pnpm bd v1 capture` from the pinned v1 build (deterministic: seeded `Math.random`, fixed viewport, tutorial suppressed, scene paused).
- Candidates: v2 renders the same fixtures (converted by the v1 importer) in headless Chromium.
- Compare: perceptual diff with thresholds from `tests/visual/thresholds.json`; outputs side-by-side + heatmap to `tests/visual/output/`.
- **Manifest geometry check:** `pnpm bd v1 verify` re-renders each block manifest with Canvas2D at v1's recorded stage metrics and diffs it against the v1 per-block references. Current result: 64/64 pixel-identical (32 blocks × 1×/2× DPR). It is proven to fail on a quarter-cell vertex shift (2.6%) and a wrong palette index (21%).
- The `/library` page is itself a visual fixture for every block × theme.

## 4. Black-box end-to-end (Playwright)
Drive the real app like a user: open, add blocks from the menu, drag into catchment, press play, and assert on **observable** outputs only: connection lines appear, the AudioWorklet output buffer is non-silent, share link round-trips, embed plays after tap. No reaching into internals except a read-only test probe (`window.__bd_probe`) that exposes engine snapshots.

### Bug regressions (owner rule, 2026-11-06)
Every bug, reported or found, is reproduced first as an automated test that **fails on the buggy build**, then fixed, and the test is kept. Browser and UI bugs go in `tests/e2e/ui-regressions.ts` (`pnpm test:ui-regressions`, one named check per bug, part of `bd ci`); engine and DSP bugs go in `engine/tests/` (e.g. `test_review_fixes.cpp`). Record the failing-then-passing evidence in the commit or change notes.

### Sharing backend (CHG-0003)
`pnpm test:sharing` (`tests/e2e/sharing.ts`, part of `bd ci`) runs the real Worker locally (`wrangler dev`, local D1). `pnpm test:sharing:base` runs it with the app under a base path, `/blokdust` (wrangler env `based`; SHARING-0004). The deployed envs serve the app at the root (SHARING-0006); test `legacy-path` covers their `/blokdust` redirect.
It uses Cloudflare's test Turnstile key, a siteverify mock and a Freesound mock (`tests/e2e/mock-services.ts`), and
answers Freesound's CDN with generated audio, so it never touches the network beyond Turnstile's script.

It checks the API guards, share → fresh browser → identical offline render hash (`__bd_probe.renderHash`), Overwrite,
Create new and remixes, previews, oEmbed, the embed in a third-party page, and samples.

`pnpm bd server smoke --env staging` runs the same suite against the deployed Worker. It drives the installed Google
Chrome over CDP without automation flags, because Turnstile refuses automated browsers but passes a normal one. That
proves the real bot check and real Freesound end to end.

### In-app support (CHG-0013)

`pnpm test:support` exercises the real Worker with a dedicated local support D1, actual Settings pointer actions,
privacy/size/type/rate guards, offline/manual retry, opt-in automatic reports and scheduled 90/365-day cleanup.

## 5. Plugin
pluginval (strictness ≥ 5) on VST3/AU; a headless host harness (JUCE `AudioPluginHost`-style CLI) loads the plugin, restores a patch, renders 10 s without the editor, and compares to the golden render.

## 6. Performance budgets
Stress fixtures (100 blocks, 2k particles): frame time p95 < 8 ms on the M-series baseline; engine < 15% of a 128-frame block at 48 kHz. Regressions > 10% fail CI. Baselines in `docs/engineering/perf-baselines.md`.
