---
id: CHG-0022
title: Video export
status: proposed
date: 2026-11-15
specs: [SPEC-SHARING-VIDEO-EXPORT]
adrs: [SHARING-0007]
---
# CHG-0022: Video export

**On hold** (owner, 2026-11-19): not convinced this is the right implementation yet; not to be released as it is.

## Why
Shared links work well on a user's own social media, but Instagram and TikTok want videos. A button that makes a video
of the patch (sound and particles) and hands it to the share sheet lets people post what they made, and every video
points back to BlokDust (owner, 2026-11-15: first of video export, user login, gallery).

## What changes
- An offline renderer plays the patch from its start in a fresh WASM engine and draws each frame with the stage's own
  drawing code, moved into `web/src/stage/drawWorld.ts` (SPEC-SHARING-VIDEO-EXPORT R1–R9, R12).
- Encoding to MP4 (H.264 + AAC) with Mediabunny, loaded on demand (R10–R11, SHARING-0007).
- Share sheet or download (R13–R14).
- Patches panel: a VIDEO tab (R15–R16).

## Out of scope
- Plugins (R16), live input, what the user plays by hand, posting through Instagram's or TikTok's APIs (SHARING-0007).

## Acceptance
- `pnpm test:video` passes: MP4 has H.264 + AAC at the chosen size, 30 fps, the chosen length plus 3 s, sound and
  moving particles; frames repeat; the panel makes the file and hands it to the share sheet (or downloads it).
- `pnpm web:typecheck && pnpm web:build && pnpm test:web`, `pnpm test:ui-regressions`, `pnpm bd visual diff --full` pass.
- Owner check on desktop and phone: a video shared to Instagram or TikTok.

## Risks and unknowns
- Encoding speed on phones (a 60 s portrait video is 1 800 frames).
- Safari's AAC and H.264 encoders through WebCodecs (Safari 26 has them; older Safari gets the WASM AAC encoder).

## As built (2026-11-15)
- Speed (Chrome, M4): an 18 s portrait video in ~5 s, a 33 s square one in ~4.5 s.
- Playwright's Chromium (no native AAC) uses the WASM AAC encoder; the same tests pass with `--chromium`.
- The end card has no watermark during the video itself (spec open question).
- Labels are drawn as they are when the video is made; the theme is the current one.

## Owner review 1 (2026-11-15)
- SHAPE is one control that cycles portrait → wide → square, drawn as Instagram's frame icons; LENGTH is the seconds,
  underlined, cycling 15 (default) → 30 → 60.
- No WHAT: the video always starts from the beginning, as the patch plays when it has just loaded. "Just played" (a
  replay of the session from a worklet log, proven bit-identical) was removed, with the log.
- No DOWNLOAD: SHARE VIDEO only (it downloads where the browser can't share files).

## Owner review 2 (2026-11-15)
- No VIDEO tab: SHARE AS VIDEO at the end of Patches › SAVE / SHARE opens the controls in place (the name stays).
- Desktop browsers (no file sharing) download the video as soon as it is made: DOWNLOAD VIDEO.

## Owner review 2 (2026-11-15), option A
- One main button: SAVE, with ADD TO GALLERY and MAKE VIDEO switches above it; SAVE AS and DOWNLOAD PATCH (not on
  phones) are quiet bordered buttons at the bottom. The plugin keeps SAVE TO COMPUTER · CREATE SHARE LINK.
- Saving with MAKE VIDEO on goes on to the video: portrait only, its length from the patch's timers (R5), shown in a
  small player with SHARE VIDEO (DOWNLOAD VIDEO on desktop).
