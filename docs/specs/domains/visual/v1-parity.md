---
id: SPEC-VISUAL-V1-PARITY
title: Visual parity with v1
status: draft
domain: visual
adrs: [UI-0001, UI-0002, UI-0003, SCOPE-0004]
updated: 2026-11-05
---
# Visual parity with v1

## Purpose
v2 must look like v1. This spec defines how "looks identical" is measured so agents can iterate unattended.

## Requirements
- **R1.** Reference images come only from `pnpm bd v1 capture` at the pinned v1 commit (`tools/v1/index.ts` `V1_SHA`), stored in `tests/visual/reference/v1/` with a manifest of hashes.
- **R2.** v2 MUST render each fixture at the same viewport and the same scene state (blocks, theme, zoom, drag offset, paused sim) and be compared with a perceptual diff.
- **R3.** Pass threshold: <= 0.5% of pixels differing beyond a per-pixel ΔE tolerance, excluding a documented anti-aliasing mask. Thresholds live in `tests/visual/thresholds.json`, never inline.
- **R4.** Every v1 block MUST have a per-block reference (`block-<category>-<Type>.png`) in at least theme 0, and SHOULD pass in all 13 themes (`--themes all`).
- **R5.** Diff artifacts (v1, v2, diff heatmap) MUST be written to `tests/visual/output/` for inspection by agents and humans.
- **R6.** Updating a reference requires an explicit tool invocation and a commit message line `visual-reference: <reason>`.
- **R7.** Interactive states are black-box: `pnpm bd ui capture` replays a fixture's pointer actions in v1, `pnpm bd ui diff` replays the same actions in the real v2 app and compares the settled frames (`tests/visual/fixtures/ui`). Masks are allowed only for content that is intentionally different (each with a `maskReason`).
- **R8.** v1's UI code is ported verbatim (`pnpm bd v1 port-ui` → `web/src/v1ui/ported`, generated) and runs on a hand-written shim of v1's framework (`web/src/v1ui/shim.ts`); behaviour fixes go in the shim or the scene, never in generated files.
- **R9.** Draw order follows v1's `MainScene` display list: connection lines, blocks, laser beams, **particles**, then the UI (tooltip, zoom, bin, options panel, header, CreateNew, share, settings). Particles never draw over a panel (`ui-regressions` `particles-under-panels`).
- **R10.** Owner-approved deviation (review 2026-11-06): the Share panel's link is a one-line field styled like the title field, with no scrollbars, and a click selects the whole link (v1 used a scrolling `<textarea>`). Both share fields take the theme's text colour, as v1's ThemeManager set it.
- **R11.** The Recorder's record button is v1's `RecorderPanel` (ported), drawn and hit-tested in v1 order with its hover and recording states (`bd ui` fixtures `recorder-hover`, `recorder-recording`). The visual harness, which has no live blocks, keeps the manifest's baked idle overlay. Alt (Option) + drag duplicates a block (`alt-duplicate`).

## Verification
- `pnpm bd v1 verify`: block manifests re-rendered with Canvas2D vs v1 per-block references: 480/480 identical across all 13 themes (R4).
- `pnpm bd visual diff --full` (used by `bd ci`): v1 compositions imported and rendered through the real v2 Stage, whole frame including v1 chrome (header, zoom buttons, trash, + icon; closed state), powered lines and laser beams: 525/525 bit-identical, 13 themes at 1x and 2x (UI-0005). Without `--full` only the region around blocks/lines is compared. Interactive states: `bd ui diff`, 33 states (menus, every options panel, settings, share, tooltip, create from menu, delete on bin, slider drag, theme change, zoom) all pass, 28 pixel-identical. Particles (animated) are not pixel-compared.
- `pnpm bd visual bakeoff`: renderer comparison report.

