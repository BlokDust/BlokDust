---
id: SPEC-VISUAL-V1-PARITY
title: Visual parity with v1
status: draft
domain: visual
adrs: [UI-0001, UI-0002, UI-0003, SCOPE-0004]
updated: 2026-11-17
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
- **R12.** *(CHG-0035, owner 2026-11-17)* v1's tour (`Tutorial`, `TutorialHotspots`) is ported verbatim and drawn in v1's display-list order. A first visit to the website (the demo, no link) is asked once, with v1's "Welcome to BlokDust."; TAKE THE TOUR clears the stage and walks through v1's steps (keys or touch), each passing when it is done; SKIP FOR NOW, TAKE THE TOUR and finishing are remembered. Starting it turns the world's power on (its emitter must fire). Settings › SETTINGS has a TOUR row (LAUNCH TOUR) under Tempo, on the web only. The last step reads: "Explore and experiment for yourself, or click PATCHES to see what other people have made in the gallery. When you've made something cool, click SAVE and ADD TO GALLERY to get a unique URL to let others see what you've made!" (`tests/e2e/ui-regressions.ts` tour).
- **R13.** *(CHG-0035)* Block menus: Sources, Powers and Interactions list the most used blocks first (`MENU_ORDER`, `web/src/v1ui/newBlocks.ts`: Tone, Noise, Wavetable, Sample, Granular, Microphone, Recorder, SampleGen, Stage · Power, Particle Emitter, Laser, Toggle, Pulse, Counter, Chance, Sound Laser, Prism, Gate, Void · Computer Keyboard, MIDI Controller, Touchpad, Label); Effects are alphabetical. Every menu hint (?) is the block's manifest `description`, v1's blocks included.
- **R14.** *(CHG-0035)* The splash title BLOKDUST 2 is v1's size where that fits and at most 80% of the screen's width (a phone held upright).
- **R15.** *(CHG-0035)* Settings › DOWNLOAD and ACCOUNT are as wide as ABOUT's text (v1's menu width: 4/7 of the panel, 5/7 on a phone). About shows no Twitter names; each person's website is on the line v1 gave the Twitter name, so the three line up.
- **R16.** *(CHG-0035)* Saving a link in Patches › SAVE / SHARE copies it to the clipboard (asked in the press itself, the link following) and v1's message bar says SAVED · LINK COPIED; where the browser refuses, it says SAVED, and COPY LINK (or a click on the link) still copies it (CHG-0037).
- **R17.** *(CHG-0035)* SampleGen's options panel has a SOUND slider (1–999) where v1 had GENERATE WAVE: each number seeds v1's generator (ported verbatim, its `Math.random` replaced by a seeded generator while it runs), so a number always makes the same wave. The number is always shown beside the handle, and the wave is made when the slider is let go, not while it moves. The patch keeps the number (`sound`) and v1's recipe (`seed`); a SampleGen without a number plays its recipe, as v1 did. A new SampleGen starts on a number of its own.
- **R18.** *(CHG-0035)* The zoom steps out to 0.15 (v1's slots plus one: 0.15, 0.25, 0.5, 1, 2, 4); pinch zoom has the same range.
- **R19.** *(CHG-0035)* Patches' tabs move their pages as v1 Settings' do: the old page lifts out in 250 ms, the new one drops in after 400 ms over 400 ms, under the tabs.
- **R20.** *(CHG-0035)* Signed out, Patches › SAVE / SHARE shows SIGN IN (v1's bordered button, right of ADD TO GALLERY, under RANDOMISE TITLE); it, or the greyed switch, opens Settings › SIGN IN, and once signed in (passkey, a new account, or back from Google or Apple within 10 minutes) SAVE / SHARE opens again with ADD TO GALLERY on and the name kept.
- **R21.** *(CHG-0035, owner 2026-11-17)* A first visit to the website (no theme kept in this browser, no `?theme=`, no theme in the opened composition) gets a colour theme at random from those matching the system's light or dark setting (dark: a dark background, palette 0: MODE STEREO, CONSOLE, SEA CUCUMBER, VOLCANOLOGIST; light: the other nine), and keeps it. Automated browsers keep theme 0 unless the URL has `firsttheme=1`.

## Verification
- `pnpm bd v1 verify`: block manifests re-rendered with Canvas2D vs v1 per-block references: 480/480 identical across all 13 themes (R4).
- `pnpm bd visual diff --full` (used by `bd ci`): v1 compositions imported and rendered through the real v2 Stage, whole frame including v1 chrome (header, zoom buttons, trash, + icon; closed state), powered lines and laser beams: 525/525 bit-identical, 13 themes at 1x and 2x (UI-0005). Without `--full` only the region around blocks/lines is compared. Interactive states: `bd ui diff`, 33 states (menus, every options panel, settings, share, tooltip, create from menu, delete on bin, slider drag, theme change, zoom) all pass, 28 pixel-identical. Particles (animated) are not pixel-compared.
- `pnpm bd visual bakeoff`: renderer comparison report.

