---
id: DATA-0005
title: "Sample sources: user files on native and web, Freesound as portable fallback"
status: accepted
date: 2026-11-05
domain: data
tags: [samples, files, freesound, plugin, cost]
supersedes: [DATA-0003]
superseded_by:
---
# DATA-0005: Sample sources: user files on native and web, Freesound as portable fallback

## Context
DATA-0003 made Freesound the default sample source. The owner pointed out that the most valuable audio is the user's own: stems and recordings from their DAW project, dropped into Sample or Granular and mangled. That audio belongs to the user, already lives on their disk or in their DAW project, and never needs to touch our servers.

## Decision
Patches store **references**, never audio, in `refs` (SPEC-PATCH-FORMAT-V2). Providers in priority order:

1. **`file`: the user's own audio file.**
   - **Plugin and Standalone (JUCE):** drag and drop from Finder/Explorer or the DAW, or use a file picker. Store the absolute path, a path relative to the patch file when there is one, and a **content fingerprint** (size + hash of the first/last 64 KB + duration) for relinking. On load, a missing file triggers a search beside the last known location, then a "relink" prompt in the block. DAW plugin state keeps the reference, so the audio stays part of the user's project.
   - **Web:** drag and drop or `<input type=file>` works everywhere for the session. On Chromium, the File System Access API keeps a `FileSystemFileHandle` in IndexedDB, so the file reloads next visit after a permission prompt. On Safari and Firefox, the user re-picks the file after a reload; the fingerprint confirms it is the same file.
2. **`freesound`: Creative Commons audio from the Freesound API** (CC0, CC-BY and CC-BY-NC accepted, with attribution shown). This is the only **portable** source: shared links, embeds and MCP patches use it, because only it resolves for someone else.
3. **`builtin`** (later): a small set of bundled synthesised one-shots shipped in the app, not served from a backend.

A patch that references `file` samples still saves and shares, but recipients see the block in a "sample missing — pick a file or a Freesound sound" state. The share dialog warns when a patch is not fully portable.

## Consequences
- Zero audio storage or bandwidth cost, and no copyright liability: the user's audio never leaves their machine.
- Engine needs a sample-loading interface owned by the host (JUCE `AudioFormatManager` natively; `decodeAudioData` on the web, transferred into WASM memory). Decoding is never done on the audio thread.
- Optional "embed audio into DAW project state" for small samples can come later. That is the user's project file, not our server, so it stays consistent with this decision.

## Alternatives considered
- **Freesound only** (DATA-0003): portable but ignores the user's own material, which is the most compelling use in a DAW.
- **Upload to our storage:** cost, liability, and against the owner's constraints.

## Implementation notes (2026-11-07, CHG-0003)
- **Web:**
  - `file` refs keep name, size, duration and a SHA-256 fingerprint of the first and last 64 KB.
  - Chromium keeps a File System Access handle in IndexedDB, keyed by that fingerprint.
  - Recipients see "MISSING · <name>" in the block's options panel.
  - Freesound is searched through the Worker, which holds the API key. The browser fetches previews from Freesound's
    CDN, so we never relay audio.
- **Default sounds:** v1's defaults lived on files.blokdust.io, which is gone. New Sample and Granular blocks start
  with CC0 Freesound sounds (`web/src/patch/samples.ts` `DEFAULT_SOUNDS`), so they play at once as in v1 and stay
  portable. This stands in for the `builtin` provider until one exists.

