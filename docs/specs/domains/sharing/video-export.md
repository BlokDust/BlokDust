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
Turn what the user played, or the patch from its start, into an MP4 video they can share to Instagram, TikTok and
other apps from the web app, without any server (SHARING-0007).

## Requirements
**Session log** (`web/src/audio/processor.ts`, `web/src/video/sessionLog.ts`)
- **R1.** The AudioWorklet MUST log each batch of commands and each sample attachment with the engine frame at which it
  applied it (the start of the next 128-frame quantum), from the moment the engine is built. The commands the engine
  is built with are frame 0.
- **R2.** Replaying the log in a fresh `WasmEngine` with the same seed and sample rate, in 128-frame quanta, MUST give
  the same audio, sample for sample, as the worklet played.
- **R3.** The log MUST record when live input (Microphone, Audio In) reached the engine. A replay that covers such a
  stretch is refused with a message ("live input can't be replayed").
- **R4.** The log is capped (500 000 commands). Past the cap, JUST PLAYED is not offered; FROM START still is.

**Rendering** (`web/src/video/`)
- **R5.** JUST PLAYED renders the last 15, 30 or 60 seconds of the session (or all of it, if shorter); FROM START
  renders the patch as it is now from a fresh engine for that long.
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
- **R12.** The same log, length and shape MUST give the same frames (the beam jitter uses a seeded random number).

**Sharing** (`web/src/video/share.ts`)
- **R13.** SHARE VIDEO opens the system share sheet with the file (Web Share API, `navigator.canShare({ files })`), with
  the title and the link as text. Where files can't be shared, it is offered as DOWNLOAD only.
- **R14.** Nothing is uploaded. The video exists only on the user's device (DATA-0005).

**Panel** (`web/src/v1ui/patches.ts`)
- **R15.** The Patches panel has a third tab, VIDEO, drawn only with v1 panel pieces: SHAPE (three buttons), LENGTH
  (three buttons), WHAT (JUST PLAYED / FROM START), MAKE VIDEO, then progress, then SHARE VIDEO and DOWNLOAD.
- **R16.** The plugin does not show the VIDEO tab.

## Scenarios
- **S1.** Given a patch played for 40 s with blocks moved and keys pressed, when the user makes a 30 s JUST PLAYED
  video, then its audio equals the worklet's output from 10 s to 40 s (R1, R2, R5).
- **S2.** Given a phone browser, when the video is made and SHARE VIDEO is pressed, then the share sheet lists the
  apps that take videos (R13).

## v1 reference
None: v1 had no video export (its Recorder block records audio only, which v2 keeps).

## Verification
- `pnpm test:video`: R1–R2 (live worklet recording vs replay hash), R3, R6–R10, R12 (MP4 checked with ffprobe:
  codecs, size, duration, frame rate), the panel (R15) by pointer.
- `pnpm test:ui-regressions`, `pnpm bd visual diff --full`: the stage drawing moved into `drawWorld.ts` unchanged.

## Open questions
- Watermark or end card only? (End card only for now.)
