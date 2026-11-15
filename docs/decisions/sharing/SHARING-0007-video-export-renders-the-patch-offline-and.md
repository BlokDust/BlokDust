---
id: SHARING-0007
title: Video export renders the patch offline and encodes in the browser
status: proposed
date: 2026-11-15
domain: sharing
tags: [sharing, video, determinism, cost]
supersedes: []
superseded_by:
---
# SHARING-0007: Video export renders the patch offline and encodes in the browser

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
- **Render, don't record.** The video plays the patch from the beginning, as when it has just loaded, in a fresh WASM
  engine on the main thread, faster than real time, and draws a frame every 1/30 s from the engine's own snapshot.
  The same patch always gives the same video.
- **Drawn by the stage's own code.** The video frames are drawn by the same Canvas2D functions as the live stage
  (connections, blocks, beams, overlays, particles, labels), framed on the blocks, without the v1 menus.
- **Encoded in the browser** with [Mediabunny](https://github.com/Vanilagy/mediabunny) (MPL-2.0, actively maintained,
  WebCodecs based): MP4, H.264 + AAC, 30 fps. Where the browser has no AAC encoder (Firefox, some Chromium builds), the
  official `@mediabunny/aac-encoder` (WASM) fills in. Both load only when a video is made.
- **Shared with the system share sheet** (Web Share API with files), which lists Instagram, TikTok and the rest on
  phones. Elsewhere the file is downloaded. Nothing is uploaded: there is no server work and no cost.

## Consequences
- The video always matches what was heard, at full frame rate, on any device; slow devices just take longer to make it.
- What the user does while playing (keys, drags) is not in the video. A first version also offered "just played": the
  worklet logged every command with the frame it applied it, and a replay of that log was bit-identical to what was
  heard (tested). The owner dropped it in review (2026-11-15) for simplicity; this ADR's approach supports bringing it
  back.
- Live input (Microphone, Audio In) is silent in the video.
- Mediabunny and the AAC encoder are new dependencies (MPL-2.0 is compatible with AGPL-3.0-or-later). They are loaded
  on demand, so the app's start-up bundle does not grow.
- The plugins do not get the feature yet (the host records audio; the editor has no share sheet).

## Alternatives considered
- **MediaRecorder on the live canvas and audio**: dropped frames, WebM on some browsers, records the UI.
- **Posting through the Instagram Graph and TikTok Content Posting APIs**: app audits, business accounts and hosted
  video; private-only posts until audited.
- **Server-side rendering (headless browser or ffmpeg)**: paid compute and stored video; no.
- **`mp4-muxer`**: deprecated by its author in favour of Mediabunny.
