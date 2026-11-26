# AGENTS.md

Instructions for every coding agent working in this repo (Claude, Codex, Gemini, etc.). `CLAUDE.md` just imports this file. Keep this file short; link to docs instead of duplicating them.

## What this is
BlokDust 2: a faithful, much faster rebuild of BlokDust (2015), a visual music playground where blocks connect **by proximity** and particles/lasers trigger sound. Targets: website, embeds, MCP App, VST3/AU/AUv3/Standalone. License **AGPL-3.0-or-later**.

## Non-negotiables
1. **v1 parity:** same blocks, same look, same feel (SCOPE-0004). Visuals are checked against v1 screenshots (SPEC-VISUAL-V1-PARITY). Don't redesign.
2. **Engine owns behaviour** (ARCHITECTURE-0002): connections, simulation, timing and audio live in C++ `engine/`; the UI only draws snapshots and sends commands.
3. **Deterministic** (SIMULATION-0001): no wall-clock, no unseeded randomness, no fast-math in engine/sim code.
4. **No audio storage** (DATA-0005): patches reference samples (user files, Freesound); never upload or embed audio on our servers.
5. **Blocks come from manifests** (DATA-0002): edit `blocks/*.block.json`, then `pnpm bd codegen`. Never hand-edit generated files.

## How to work (details: docs/engineering/agent-factory.md)
1. Find or create the change: `docs/specs/changes/` (`pnpm bd new change "Title"`).
2. Read only what it links: specs in `docs/specs/domains/`, ADRs via `docs/decisions/README.md` (domain sub-indexes for targeted reading).
3. **Before writing any script, check `tools/README.md`.** Repeated mechanical work becomes a tool (`tools/<name>/index.ts` + `tool.json`), run via `pnpm bd <name>`.
4. Implement against requirement IDs (e.g. `SPEC-CONNECTIONS-PROXIMITY R5`) and cite them in tests.
5. Verify before handing back: `pnpm bd index --check` plus every gate relevant to your change (see docs/engineering/testing-strategy.md). Report failures honestly with output.
6. Record: tick `tasks.md`; new decisions → `pnpm bd new adr <domain> "Title"`; behaviour changes → update the spec; then `pnpm bd index`.

Branches and releases: [docs/engineering/branches-and-releases.md](docs/engineering/branches-and-releases.md) (`main` → staging; releases are tags).

## Private operations
Read `~/.config/blokdust/LOCAL.md` if present before deployment, signing, notarization or tests on configured machines.
Tools load `~/.config/blokdust/config.env` (environment overrides); see [local configuration](docs/engineering/local-configuration.md).
Keep local values, hostnames, paths and machine-specific diagnostics out of committed artifacts and PR text.
Run `pnpm bd privacy check` before committing and `pnpm bd privacy history` before pushing.

## Commands
- `pnpm check`: docs indexes + codegen up to date (run after editing docs or `blocks/`)
- `pnpm bd codegen`: regenerate engine/web code from block manifests
- `pnpm engine:configure && pnpm engine:build && pnpm test:engine`: C++ engine tests
- `pnpm web:build && pnpm test:web`: web build + browser smoke test
- `pnpm bd v1 verify`: block manifests vs v1 pixels
- `pnpm bd visual diff --full`: the real v2 stage (whole frame, v1 chrome included) vs v1 screenshots (needs `pnpm web:build`)
- `pnpm bd ui capture|diff`: interactive v1 UI states (same pointer actions in v1 and the v2 app)
- `pnpm test:e2e`: build a patch with v1's UI and hear it (CHG-0002 acceptance)
- `pnpm test:sharing`: sharing backend + embeds + samples (local `wrangler dev`, Turnstile test key, Freesound/siteverify mocks)
- `pnpm bd server dev|setup|secret|deploy|smoke`: the Cloudflare Worker + D1 in `server/` (staging = owner review; production only after a merge)
- `pnpm test:gallery`: the public gallery (publish, search, likes, remixes, reports, `bd gallery` review)
- `pnpm test:accounts`: optional accounts (local Worker, mocked Google/siteverify, Chrome's virtual passkey authenticator)
- `pnpm test:video`: video export in Google Chrome (MP4 checked with ffprobe/ffmpeg; `--chromium` for the WASM AAC path)
- `pnpm test:mpe`: the web MPE/MIDI parser on the shared streams in `tests/mpe/` (the C++ parser runs them in the engine tests; PLUGIN-0004)
- `pnpm test:ui-regressions`: one browser test per UI bug found in review; every new bug gets a failing test here (or in engine tests) before its fix
- `pnpm bd render --check --configs release,dev`: golden audio/event hashes
- `pnpm bd v1 audio` / `pnpm bd audio compare|selftest`: v1 audio references and the sounds-like-v1 check (SPEC-AUDIO-V1-PARITY)
- `pnpm bd wasm test` / `pnpm test:worklet`: WASM and browser AudioWorklet ≡ native golden hashes (`pnpm bd wasm setup` once)
- `pnpm bd plugin test` / `pnpm bd plugin au`: JUCE plugin build, pluginval/auval, built VST3/AU ≡ native golden, editor bridge
- `pnpm bd plugin deploy [--no-build]`: ship the plugins to the externally configured test host. **Run after every change that reaches the plugins** (plugin/, engine/, web/)
- `pnpm bd win engine|plugin`: the same on the Windows 11 VM (tools/win-vm/README.md)
- `pnpm lint` (`bd lint [--staged]`): tsc, Prettier, ESLint, `bd comments`, clang-format, clang-tidy; baselines may only shrink (PROCESS-0006), `bd lint prune` after fixing
- `pnpm bd size check [--staged]`: files may hold about 5,000 tokens; ones already over (tools/size/baseline.json) may only shrink. The pre-commit hook (`pnpm bd size install`) runs it and says how to split a file
- `pnpm bd perf`: performance baselines → docs/engineering/perf-baselines.md (not a gate)
- `pnpm bd ci`: run all of the above locally (GitHub Actions is manual-only)

## Docs map
- `docs/architecture/`: how it fits together
- `docs/decisions/<domain>/`: ADRs (statuses: proposed, accepted, deferred, rejected, superseded, deprecated)
- `docs/specs/{domains,changes,templates}/`: behaviour specs, work proposals, templates
- `docs/engineering/`: agent loop, testing, toolchain
- `docs/plans/`: roadmap
- `docs/reference/`: v1 facts (`v1-audio.md`: measured v1 sound)
- `web/src/v1ui/`: v1's UI, ported verbatim (`ported/`, generated by `bd v1 port-ui`) on a shim; never edit `ported/`

## v1 reference
`pnpm bd v1 fetch` puts v1 source at `.cache/v1` (pinned commit). `pnpm bd v1 capture` makes reference screenshots in `tests/visual/reference/v1/`. Read v1 code there instead of guessing.

## Conventions
- Node ≥ 24, pnpm. Tools are TS run directly by Node (no build); stdout = JSON, stderr = logs.
- C++20, no exceptions or allocation on the audio thread.
- Commits: imperative subject; reference change/spec IDs; `golden-update:` / `visual-reference:` lines when updating references.
