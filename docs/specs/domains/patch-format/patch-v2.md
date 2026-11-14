---
id: SPEC-PATCH-FORMAT-V2
title: Patch format v2
status: draft
domain: patch-format
adrs: [DATA-0001, DATA-0005, DATA-0004, SCOPE-0002, PLUGIN-0003]
updated: 2026-11-10
---
# Patch format v2

## Purpose
The single, portable representation of a BlokDust creation, used by the web app, embeds, the plugin state, the backend and MCP.

## Requirements
- **R1.** A patch MUST validate against `schema/patch.v2.schema.json` (generated from block manifests).
- **R2.** Shape:
  ```json
  {
    "format": "blokdust.patch", "version": 2,
    "seed": 123456, "tempo": 120, "theme": 0,
    "view": { "x": 0, "y": 0, "zoom": 1 },
    "blocks": [ { "id": "b1", "type": "source.tone", "x": 0, "y": 0, "z": 1, "params": { "waveform": "sine", "frequency": 440 } } ],
    "refs": {
      "freesound:12345": { "provider": "freesound", "id": 12345, "name": "Glass Bell", "username": "user", "license": "CC0", "licenseUrl": "…", "duration": 4.2, "preview": "https://cdn.freesound.org/…-hq.mp3", "url": "https://freesound.org/…" },
      "file:vocal-stem.wav": { "provider": "file", "name": "vocal-stem.wav", "bytes": 1234567, "durationSec": 12.5, "hash": "sha256:…" }
    },
    "automation": [ { "slot": 3, "block": "b7", "param": "cutoff" } ],
    "macros": [],
    "meta": { "title": "", "parent": null, "created": "2026-11-05T00:00:00Z" }
  }
  ```
- **R2a.** `view` is the view the patch was saved at (`x`, `y`: the stage offset in grid units; `zoom`). Saving
  (files, share links, the autosave, the plugin's DAW state) records it; opening shows it; Insert ignores it; the engine
  never reads it (owner, 2026-11-12, CHG-0010).
- **R2b.** *(CHG-0020, UI-0011)* `labels` (optional) is a list of notes on the stage: `{ id, text, x, y }`, `x`/`y` in grid units (half cells allowed), `text` at most 200 characters. Readers that do not know it ignore it; the engine never reads it. Insert brings a patch's labels along, moved with its blocks.
- **R3.** Block `type` MUST be a stable namespaced id from the manifests (`source.*`, `fx.*`, `power.*`, `input.*`). Params MUST be in real units declared by the manifest; unknown params are dropped with a warning; missing params take defaults.
- **R3a.** *(CHG-0018, AUDIO-0003)* An LFO names what it moves in its `target` param, a string `"<block id>:<param key>"` (patch ids, so it survives renumbering; Insert rewrites it when a block's id changes). Loaders turn it into the engine's `targetBlock`/`targetParam` once every block is known; those two are session-only and MUST NOT be read from a patch. A target that cannot be resolved leaves the LFO idle.
- **R4.** Connections MUST NOT be stored (SPEC-CONNECTIONS-PROXIMITY R7). Their order is: optional
  `connectionOrder`, `[[blockId, blockId], …]`, the connected pairs oldest first (SPEC-CONNECTIONS-PROXIMITY R4a). Loaders
  replay it after adding the blocks; pairs that are unknown or not connected are ignored, and without it pairs connect in
  block order.
- **R5.** Samples MUST be references into `refs`, never embedded audio (DATA-0005). A sampler block's `track` param is
  the ref key: `freesound:<id>` or `file:<name>`. Providers:
  - `freesound`: portable.
  - `file`: the user's own audio, with a fingerprint for relinking. Native builds add the path (Phase 3).

  Only refs used by a block are kept. A patch with any `file` ref is marked non-portable when shared
  (SPEC-SHARING-BACKEND R12–R14).
- **R5a.** `automation` maps the 8 host slots to block params (PLUGIN-0003). An entry may carry `cc` (0–127): a
  MIDI CC learned for that slot (CHG-0004 3.9). entries pointing at missing blocks are dropped on load. The plugin editor edits it (right-click a slider → DUST n / CLEAR): one entry per slot and per block param.
- **R5b.** A patch can travel in a URL as `?c=p<base64url(deflate-raw(JSON))>` (`web/src/patch/share.ts`); tokens without the `p` prefix are server share ids (SPEC-SHARING-BACKEND R1). Patches never contain audio: a Sample keeps `track`/`trackName` of the user's file only (DATA-0005).
- **R6.** Serialized size MUST be <= 64 KB; typical patches are a few KB. Compressed patches <= ~2 KB SHOULD be shareable in a URL fragment (`#p=`).
- **R6a.** `tempo` (BPM) is optional; it is written once the user sets one (SIMULATION-0003). In the plugin, the
  host's tempo overrides it.
- **R7.** `macros` is reserved (SCOPE-0002) and MUST be an empty array until macros ship.
- **R8.** Migrations are pure functions `migrate_vN_to_vN+1`; the v1 importer is `import_v1` (DATA-0004).
- **R9.** Serialization MUST be canonical (stable key order, ids sorted by z then id) so identical patches hash identically.
- **R10.** Patch files (CHG-0005): a `.blokdust` file is a v2 patch as UTF-8 JSON, its title in `meta.title`. The
  same file opens in the plugin and on the web; v1 save files (`{Composition: […]}`) open too (R8 import).
  - **Open** replaces the scene: blocks, refs and tempo (the plugin keeps the host's tempo, R6a); `automation` is dropped.
  - **Insert** adds the file's blocks, keeping their layout, with ids that don't clash; their refs come along; the
    file's tempo and automation are ignored. The blocks then follow the pointer (drawn like a pressed block) until a
    click puts them down; on a touch screen they start in the middle of the view and a finger drags them, lifting it puts
    them down. Esc cancels; Cmd/Ctrl+Z right after takes the whole Insert out again.
  - **Open** over unsaved changes (the patch differs from what was last saved, shared or opened) asks first: CANCEL ·
    SAVE FIRST · OPEN ANYWAY. Insert never asks.
  - A picked or dropped file asks Open or Insert; a file that isn't a patch says so.
  - OPEN lists the user's own patches above the built-in presets: in the plugin, the patches folder; on the web, the
    patches this browser saved (to a file or a link), one per title, kept in the browser's local storage only.
  - The plugin's SAVE tab has SAVE TO COMPUTER, then CREATE SHARE LINK, which opens the public site with the patch in
    the address (`?c=p…&t=<title>&share=1`); the site opens Patches on SAVE, ready to make the link there.
  - Patches opens on the tab last chosen. OPEN FROM YOUR DEVICE is the OPEN tab's main (filled) button.
  - The web's SAVE tab is three buttons, no help lines (owner, 2026-11-11): SAVE · SAVE AS · DOWNLOAD PATCH.
    Share links (SPEC-SHARING-BACKEND): SAVE makes the link the first time; once the patch changes it puts the changes
    on the same link (v1 SAVE; a link made elsewhere gets a new one); unchanged, it is off. SAVE AS makes a new link
    and leaves the old one as it was (v1 SAVE_AS); it is offered only while the patch differs from what its link holds,
    so the same patch can't be saved as link after link (on top of the server's bot check and per-client limit,
    SPEC-SHARING-BACKEND R3–R5). The link shows under "Share your creation with this unique URL:"; clicking it copies
    it. DOWNLOAD PATCH is SAVE TO COMPUTER below. Colours: SAVE and SAVE AS are v1 SharePanel's SAVE / SAVE AS; DOWNLOAD
    PATCH has black text on v1's third options-panel colour (Mode Stereo's green), or, in palettes where black on that
    is under WCAG 4.5:1, the options colour most readable with black (test `download-colour`, all 13 palettes).
  - The user's own patches in OPEN have a bin (asks "Delete <name>?" first): the web takes the patch off this browser's
    list (files on the device and links are untouched); the plugin moves the file to the Trash.
  - Samples stay references (R5): a `file` ref the machine can't find shows as missing and is relinked by dropping a
    file on the block or with LOCATE FILE.
  - SAVE TO COMPUTER (the web's DOWNLOAD PATCH) lets the user choose where: the plugin's save dialog starts in `~/Music/BlokDust/Patches`; on the
    web the browser's save dialog where there is one (starting in Music, then the folder last used for patches), else a
    download. Patch names may use any characters; the file name drops only those a file system can't hold.
  - Built-in presets ship as `.blokdust` files (`web/src/patch/presets/`).

## Verification
Schema tests; round-trip property tests (parse → serialize → parse); v1 import tests against `tests/visual/fixtures/v1/*.json`; size checks.
