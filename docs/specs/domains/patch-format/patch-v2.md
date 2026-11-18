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
- **R2b.** Params hold a block's state as it is now, including state the engine changes by itself: a Toggle's `logic`
  (on/off) follows its particle and laser hits, so a file, share link, autosave or DAW project reopens with each Toggle
  as it was (v1's Toggle kept `Params.logic`). That change alone is not an unsaved edit (owner, 2026-11-13, CHG-0013;
  test `toggle-state-saved`).
- **R2c.** *(CHG-0020, UI-0011)* `labels` (optional) is a list of notes on the stage: `{ id, text, x, y }`, `x`/`y` in grid units (half cells allowed), `text` at most 200 characters. Readers that do not know it ignore it; the engine never reads it. Insert brings a patch's labels along, moved with its blocks.
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
- **R7.** *(CHG-0021, SCOPE-0006)* `macros` (optional) holds what is inside each Stage block: `{ block, blocks, connectionOrder?, labels?, view? }`, where `block` is the Stage's patch id and the rest read as the same keys of a patch (R2a, R2b, R2c, R3, R4). Ids inside a macro are their own namespace; an LFO `target` (R3a) there names a block of the same macro. A macro whose `block` is not a `source.stage` in `blocks` is dropped; a `source.stage` inside a macro has no world (one level). Refs are patch-wide. Insert brings the macros of the Stages it adds.
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
  - OPEN lists the user's own patches: in the plugin, the patches folder, above the built-in presets; on the web, the
    patches this browser saved (to a file or a link), one per title, kept in the browser's local storage only, and the
    signed-in account's (owner review 3, 2026-11-16: on the web the presets are @blokdust's EXAMPLES in the gallery,
    SPEC-SHARING-GALLERY R16, so OPEN is empty until the user saves something). OPEN's rows are one list that scrolls
    (mouse wheel or a drag, as the gallery's; owner, 2026-11-16: no pages of five).
  - The plugin's SAVE tab has SAVE TO COMPUTER, then CREATE SHARE LINK, which opens the public site with the patch in
    the address (`?c=p…&t=<title>&share=1`); the site makes the link as it loads (as SAVE would) and the address bar
    shows it, short, to copy; START shows the scene (owner, 2026-11-13, CHG-0013; it used to open Patches on SAVE).
  - Patches opens on the tab last chosen. OPEN FROM YOUR DEVICE is a bordered button like RANDOMISE TITLE at the right
    of the row under OPEN's list (where GALLERY has its sorts; owner, 2026-11-18), except in a phone's browser, where it
    opens nothing useful (owner, 2026-11-16). OPEN has no hint line; its list and GALLERY's start 175 units over the
    centre (never closer than 50 units under the tabs) and their windows are the same size (owner, 2026-11-18).
  - While SAVE saves, the button reads SAVING; there is no spinner or line under it (owner, 2026-11-18).
  - SAVE / SHARE's link (owner, 2026-11-18, mockup options 3, 3c and 4): saved and unchanged, there is no SAVE button;
    in its place "Saved. Share your creation with this unique URL:", the link small on a rule (a click copies it) and a
    bordered COPY LINK at its right; on a phone COPY LINK and SHARE (the device's share sheet) go under the link.
    Changed since, SAVE CHANGES (SAVE for a link this device can't save over) comes back and the link sits under it,
    dimmed. Copying and saving are confirmed in v1's message bar (LINK COPIED, SAVED · LINK COPIED).
  - The user's own patches don't share a name (owner, 2026-11-18): a save that makes a new link with a name already
    used by another of them (OPEN's list) gets " (2)", " (3)"…, put in the name field before it saves; saving over a
    link may keep its own name.
  - On a phone (portrait) OPEN and GALLERY run from the tabs to the foot of the screen, with taller rows in larger type,
    and the video view from the tabs down (owner, 2026-11-16: v1 centred its pages, leaving wide gaps on a tall screen).
  - The video view (after SAVE with MAKE VIDEO on) shows the player, its button and the patch's link to copy; no name
    or RANDOMISE TITLE (the name is chosen by then); BACK at the top left (owner, 2026-11-16).
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
    list (files on the device and links are untouched); the plugin moves the file to the Trash (iPad: deletes it, as
    iPadOS has no Trash).
  - Samples stay references (R5): a `file` ref the machine can't find shows as missing and is relinked by dropping a
    file on the block or with LOCATE FILE.
  - SAVE TO COMPUTER (the web's DOWNLOAD PATCH) lets the user choose where: the plugin's save dialog starts in `~/Music/BlokDust/Patches`; on the
    web the browser's save dialog where there is one (starting in Music, then the folder last used for patches), else a
    download. Patch names may use any characters; the file name drops only those a file system can't hold.
  - iPad (CHG-0025): the patches folder is `BlokDust/Patches` in an App Group shared by the app and its AUv3, so both
    list the same patches. SAVE TO COMPUTER exports a copy through the document picker (to Files, iCloud Drive or
    another app's folder), and FROM YOUR COMPUTER opens a file picked there.
  - Built-in presets ship as `.blokdust` files (`web/src/patch/presets/`); `pnpm bd gallery presets` publishes them as @blokdust's.
- **R11.** A patch lists where its blocks came from (owner review 3, 2026-11-16), so how patches were combined can be
  followed back one day (a family tree in the gallery):
  - `sources`: one entry per saved (server) patch that INSERT brought in: `{ id, rev, title, by, blocks }`, `blocks`
    being the ids, in this patch, of the blocks it brought that are still here. Entries with no blocks left are
    dropped on save; at most the newest 32 are kept (older ones stay reachable through the newer sources' own
    lists).
  - Opening a patch keeps its `sources`; inserting one carries its `sources` along under the blocks' new ids, so the
    whole chain survives even when the middle patch is a local file.
  - A patch opened from a link and saved again is a remix: the server keeps `parent` (SPEC-SHARING-GALLERY R11).
  - The plugin has no gallery: what it inserts from files carries no `sources` yet.

## Verification
Schema tests; round-trip property tests (parse → serialize → parse); v1 import tests against `tests/visual/fixtures/v1/*.json`; size checks.
