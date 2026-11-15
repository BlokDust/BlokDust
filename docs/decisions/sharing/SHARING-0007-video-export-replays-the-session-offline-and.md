---
id: SHARING-0007
title: Video export replays the session offline and encodes in the browser
status: proposed
date: 2026-11-15
domain: sharing
tags: [sharing, video, determinism, cost]
supersedes: []
superseded_by:
---
# SHARING-0007: Video export replays the session offline and encodes in the browser

## Context
The owner wants a button that turns a patch into a video (sound and visuals) that can be shared to Instagram, TikTok
and other apps (2026-11-15). Those apps take MP4 (H.264 video, AAC audio), ideally portrait 9:16.

Recording the screen while it plays (`canvas.captureStream()` + `MediaRecorder`) drops frames on slow devices, gives
WebM in some browsers, and records menus and pointers too. BlokDust's engine is deterministic (SIMULATION-0001): the
same commands at the same samples give the same audio and the same particles. The AudioWorklet runs it in fixed
128-frame quanta, and commands only reach it between quanta.

Instagram's and TikTok's posting APIs need app review, business accounts, or a public URL for the video. A public URL
means hosting video, which costs money and goes against the spirit of DATA-0005.

## Decision
- **Replay, don't record.** The AudioWorklet logs every command and sample attachment with the frame at which it applied
  it. A video of "what I just played" re-runs that log from the start in a fresh WASM engine on the main thread, faster
  than real time, and draws a frame every 1/30 s from the engine's own snapshot. "From the start" renders the patch as
  it is now with an empty log. The audio in the video is sample-for-sample what the worklet played.
- **Drawn by the stage's own code.** The video frames are drawn by the same Canvas2D functions as the live stage
  (connections, blocks, beams, overlays, particles, labels), framed on the blocks, without the v1 menus.
- **Encoded in the browser** with [Mediabunny](https://github.com/Vanilagy/mediabunny) (MPL-2.0, actively maintained,
  WebCodecs based): MP4, H.264 + AAC, 30 fps. Where the browser has no AAC encoder (Firefox, some Chromium builds), the
  official `@mediabunny/aac-encoder` (WASM) fills in. Both load only when a video is made.
- **Shared with the system share sheet** (Web Share API with files), which lists Instagram, TikTok and the rest on
  phones. Elsewhere the file is downloaded. Nothing is uploaded: there is no server work and no cost.

## Consequences
- The video always matches what was heard, at full frame rate, on any device; slow devices just take longer to make it.
- The worklet keeps a log for the whole session (small: commands, not audio). Very long sessions take longer to replay;
  the log has a cap, past which only "from the start" is offered.
- Live input (Microphone, Audio In) is not in the log; a session that used it says so instead of making a wrong video.
- Mediabunny and the AAC encoder are new dependencies (MPL-2.0 is compatible with AGPL-3.0-or-later). They are loaded
  on demand, so the app's start-up bundle does not grow.
- The plugins do not get the feature yet (the host records audio; the editor has no share sheet).

## Alternatives considered
- **MediaRecorder on the live canvas and audio**: dropped frames, WebM on some browsers, records the UI.
- **Posting through the Instagram Graph and TikTok Content Posting APIs**: app audits, business accounts and hosted
  video; private-only posts until audited.
- **Server-side rendering (headless browser or ffmpeg)**: paid compute and stored video; no.
- **`mp4-muxer`**: deprecated by its author in favour of Mediabunny.
