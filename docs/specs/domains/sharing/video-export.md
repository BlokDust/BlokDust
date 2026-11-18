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
- **R5.** The video runs whole cycles of the patch's longest timer, 10 to 30 seconds (owner review 2: a fixed 15 s was
  arbitrary): tempo-synced Laser turns, Particle Emitter and Pulse divisions, LFO divisions or free rates, and a
  Counter's steps of the shortest tick. Without timers, 15 seconds. Then the end card (`web/src/video/length.ts`).
- **R6.** Each video frame (30 fps) MUST show the engine's state at the quantum boundary nearest to that frame's time:
  connections, blocks, beams, overlays, particles and labels, drawn by the same code as the live stage
  (`web/src/stage/drawWorld.ts`), in the current theme, without the v1 menus or panels.
- **R7.** The camera is fixed for the whole video and frames every block that is on the stage during it, with a margin.
- **R8.** After the chosen length, a 3-second end card shows the patch title, the share link (or the site address) and
  credits for every Freesound sound used, while the audio carries on (reverb tails).
- **R9.** Portrait, 1080×1920 (owner review 2: the shape Instagram and TikTok use; SQUARE 1080×1080 and WIDE
  1920×1080 remain in the renderer, not offered).
- **R10.** Output: MP4 with H.264 video and AAC audio (stereo, the session's sample rate). Where the browser cannot
  encode AAC, the WASM AAC encoder is used. Where it cannot encode H.264, the panel says so.
- **R11.** Rendering MUST NOT stop the live audio or the page: work is done in slices that yield to the page, and shows
  its progress. It can be cancelled.
- **R12.** The beam jitter uses a seeded random number, so frames repeat (R2).

**Sharing** (`web/src/video/share.ts`)
- **R13.** Where the browser can share files (phones, tablets: `navigator.canShare({ files })`), SHARE VIDEO under the
  player opens the share sheet with the file, the title and the link as text (apps that keep text get the link;
  Instagram drops it). Elsewhere (desktop browsers) the file downloads as soon as it is made and the button reads
  DOWNLOAD VIDEO (owner review 2026-11-15).
- **R14.** Nothing is uploaded. The video exists only on the user's device (DATA-0005).

**Panel** (`web/src/v1ui/patches.ts`)
- **R15.** Patches › SAVE / SHARE has a MAKE VIDEO switch beside ADD TO GALLERY (owner review 2, option A): on by
  default where the browser can share files, off elsewhere. It is hidden, and off, until the export gets its own round
  of work (owner, 2026-11-17, CHG-0035): `?video=1` shows it. SAVE with it on saves, then makes the video: the tab's
  lower half shows the progress (CANCEL stops it at once), then the video in a small portrait player with SHARE VIDEO
  (DOWNLOAD VIDEO) under it; BACK (top right) returns. With nothing to save, the main button reads MAKE VIDEO.
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
