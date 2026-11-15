---
id: SPEC-SHARING-VIDEO-EXPORT
title: Video export
status: draft
domain: sharing
adrs: [SHARING-0007, SIMULATION-0001, DATA-0005, UI-0005]
updated: 2026-11-15
---
# Video export

## Purpose
Turn the patch, played from the beginning as when it has just loaded, into an MP4 video the user can share to
Instagram, TikTok and other apps from the web app, without any server (SHARING-0007).

## Requirements
**Playing the patch** (`web/src/video/replay.ts`, `sources.ts`)
- **R1.** The video plays the patch as it is now, from a fresh WASM engine built as the worklet is at START (same
  seed and sample rate), its samples attached after the first quantum, in 128-frame quanta.
- **R2.** The same patch, length and shape MUST give the same audio and the same frames (determinism,
  SIMULATION-0001).
- *(Owner review 2026-11-15: "just played", a replay of the user's session from a log the worklet kept, was built and
  then dropped: videos always start from the beginning.)*

**Rendering** (`web/src/video/`)
- **R5.** The video is 15 (the default), 30 or 60 seconds long, then the end card.
- **R6.** Each video frame (30 fps) MUST show the engine's state at the quantum boundary nearest to that frame's time:
  connections, blocks, beams, overlays, particles and labels, drawn by the same code as the live stage
  (`web/src/stage/drawWorld.ts`), in the current theme, without the v1 menus or panels.
- **R7.** The camera is fixed for the whole video and frames every block that is on the stage during it, with a margin.
- **R8.** After the chosen length, a 3-second end card shows the patch title, the share link (or the site address) and
  credits for every Freesound sound used, while the audio carries on (reverb tails).
- **R9.** Shapes: PORTRAIT 1080×1920, SQUARE 1080×1080, WIDE 1920×1080.
- **R10.** Output: MP4 with H.264 video and AAC audio (stereo, the session's sample rate). Where the browser cannot
  encode AAC, the WASM AAC encoder is used. Where it cannot encode H.264, the panel says so.
- **R11.** Rendering MUST NOT stop the live audio or the page: work is done in slices that yield to the page, and shows
  its progress. It can be cancelled.
- **R12.** The beam jitter uses a seeded random number, so frames repeat (R2).

**Sharing** (`web/src/video/share.ts`)
- **R13.** SHARE VIDEO opens the system share sheet with the file (Web Share API, `navigator.canShare({ files })`), with
  the title and the link as text. Where files can't be shared (most desktop browsers), it downloads the file.
- **R14.** Nothing is uploaded. The video exists only on the user's device (DATA-0005).

**Panel** (`web/src/v1ui/patches.ts`)
- **R15.** The Patches panel has a third tab, VIDEO (owner review 2026-11-15): SHAPE, a frame icon in the video's
  shape (as Instagram's crop icons) that cycles PORTRAIT → WIDE → SQUARE when pressed; LENGTH, its seconds underlined,
  cycling 15 → 30 → 60; MAKE VIDEO, then progress (CANCEL stops it at once), then SHARE VIDEO.
- **R16.** The plugin does not show the VIDEO tab.

## Scenarios
- **S1.** Given a patch, when the user makes a video twice with the same shape and length, then both have the same
  frames (R2).
- **S2.** Given a phone browser, when the video is made and SHARE VIDEO is pressed, then the share sheet lists the
  apps that take videos (R13).

## v1 reference
None: v1 had no video export (its Recorder block records audio only, which v2 keeps).

## Verification
- `pnpm test:video`: R2 (repeatable frames), R5–R10 (MP4 checked with ffprobe/ffmpeg: codecs, size, duration, frame
  rate, sound, moving particles), R11 (cancel), R13 (share sheet; download fallback), the panel (R15) by pointer.
- `pnpm test:ui-regressions`, `pnpm bd visual diff --full`: the stage drawing moved into `drawWorld.ts` unchanged.

## Open questions
- Watermark or end card only? (End card only for now.)
