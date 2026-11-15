---
id: CHG-0022
title: Video export
status: proposed
date: 2026-11-15
specs: [SPEC-SHARING-VIDEO-EXPORT]
adrs: [SHARING-0007]
---
# CHG-0022: Video export

## Why
Shared links work well on a user's own social media, but Instagram and TikTok want videos. A button that makes a video
of the patch (sound and particles) and hands it to the share sheet lets people post what they made, and every video
points back to BlokDust (owner, 2026-11-15: first of video export, user login, gallery).

## What changes
- The AudioWorklet logs what it applied and when (SPEC-SHARING-VIDEO-EXPORT R1–R4).
- An offline renderer replays the log (or the patch from its start) in a fresh WASM engine and draws each frame with
  the stage's own drawing code, moved into `web/src/stage/drawWorld.ts` (R5–R9, R12).
- Encoding to MP4 (H.264 + AAC) with Mediabunny, loaded on demand (R10–R11, SHARING-0007).
- Share sheet or download (R13–R14).
- Patches panel: a VIDEO tab (R15–R16).

## Out of scope
- Plugins (R16), live input in replays (R3), posting through Instagram's or TikTok's APIs (SHARING-0007).

## Acceptance
- `pnpm test:video` passes: replay ≡ worklet audio; MP4 has H.264 + AAC at the chosen size, 30 fps, the chosen length
  plus 3 s; the panel makes and offers the file.
- `pnpm web:typecheck && pnpm web:build && pnpm test:web`, `pnpm test:ui-regressions`, `pnpm bd visual diff --full` pass.
- Owner check on desktop and phone: a video shared to Instagram or TikTok.

## Risks and unknowns
- Encoding speed on phones (a 60 s portrait video is 1 800 frames).
- Safari's AAC and H.264 encoders through WebCodecs (Safari 26 has them; older Safari gets the WASM AAC encoder).

## As built (2026-11-15)
- Replay is bit-identical to the worklet (`replay-matches-worklet`: blocks dragged during the capture).
- Speed (Chrome, M4): an 18 s square video in ~2.5 s; a 12 s portrait JUST PLAYED in ~4.5 s.
- Playwright's Chromium (no native AAC) uses the WASM AAC encoder; the same tests pass with `--chromium`.
- The end card has no watermark during the video itself (spec open question).
- Labels are drawn as they are when the video is made; the theme is the current one.
