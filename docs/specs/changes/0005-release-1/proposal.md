---
id: CHG-0005
title: Release 1
status: approved
date: 2026-11-08
specs: [SPEC-PATCH-FORMAT-V2, SPEC-VISUAL-V1-PARITY]
adrs: [DATA-0005, LICENSING-0001, LICENSING-0002]
---
# CHG-0005: Release 1

## Why
Phases 0–3 give a working website and plugin. The owner (2026-11-08) is deferring the MCP app (Phase 4) and most of
Phase 5, and releasing the website and free plugins first, quietly, at blokdust.funputs.com. Before real users arrive,
plugin users need a way to keep and reuse their patches, and the website has to work properly on phones and tablets.

## What changes
1. **Bugs found by the owner** (test first): Clear stage → tick breaks the UI (web, mobile, plugin); Safari's long-press
   magnifier; swiping selects the whole page.
2. **iOS sound with the silent switch on**: the page plays as media, like the owner's Funputs apps.
3. **Patch files** (`.blokdust`: the patch format v2 JSON, SPEC-PATCH-FORMAT-V2):
   - Plugin: a Patches panel in place of Share (Save, Save As, Open, Insert, a list of `~/Music/BlokDust/Patches`).
   - Web: Save file (download), Open file, Insert file, and dropping a `.blokdust` file on the stage.
   - **Open** replaces the scene; **Insert** adds the patch's blocks near the middle of the view, keeping their layout
     and arriving selected.
   - Files saved in the plugin open on the web. Missing user files show as missing and can be relinked by dropping a
     file on the block or with a **Locate…** button (file picker). Audio stays out of the file (DATA-0005).
4. **Built-in presets** in the same panel, loadable with Open or Insert: e.g. MIDI keyboard + Tone + Envelope;
   Microphone + Convolution reverb + Recorder; a rotating Laser over Tones in a scale (a sequence); synced Emitters
   at different offsets (a step sequencer).
5. **Multi-select**: Shift/Cmd-click, Shift-drag box, long press then taps on touch; move, duplicate and delete
   together.
6. **Multi-touch**: two-finger pinch zoom; each finger drags its own block or moves its own slider.
7. **Tour hidden** for now (to come back later, possibly replaced by presets).
8. **Hosting at blokdust.funputs.com** (SHARING-0006; funputs.com/blokdust redirects there); new Cloudflare resources only with owner approval.
   blokdust.com redirect if its owner agrees.
9. **Credits**: "Originally created in 2015 by Luke Twyman, Luke Phillips and Edward Silverton. Rebuilt and maintained
   by Luke Phillips at Funputs.", linking the original project; v1's MIT notice kept.
10. **Plugin distribution**: signed and notarised macOS installer, Windows signing, version numbers, a download page.

New UI copies existing v1 design (SCOPE-0004): find an existing v1 panel or control first; show the owner a
screenshot before building anything that has no v1 precedent.

## Out of scope
- XY pad block: its own branch and thread after Release 1 (owner prototypes the options).
- iPad AUv3: after Release 1, before the main launch.
- MCP app (Phase 4); new blocks and remaining themes (Phase 5).
- Publishing patches online from the plugin (users share `.blokdust` files themselves).

## Acceptance
- `pnpm bd ci` green; every bug above has a failing-then-passing test in `pnpm test:ui-regressions` or the engine tests.
- A patch saved in the plugin opens identically on the web (same render hash), and Insert keeps the existing scene.
- Owner review on iPhone/iPad Safari, in Logic and Live, and at the staging URL.

## Risks and unknowns
- iOS Safari gestures (magnifier, double-tap zoom) ignore some CSS and need script workarounds.
- Multi-touch must not break v1's mouse feel (SCOPE-0004).
- Windows code signing needs a certificate the owner may not have yet.
