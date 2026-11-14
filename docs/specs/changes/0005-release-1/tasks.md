# CHG-0005 tasks: Release 1

Order agreed with the owner on 2026-11-08: bugs and iOS sound first, then patch files and presets, then multi-touch
and multi-select, then hosting, credits and distribution.

- [x] 1. Clear stage → tick breaks the UI (web, mobile, plugin): failing test, fix
- [x] 2. Safari: no long-press magnifier, no whole-page selection when swiping (port the Funputs fixes)
- [x] 3. iOS: sound with the silent switch on
- [x] 4. Hide the Tour button (note: bring back later, maybe replaced by presets)
- [x] 4b. Touch: dropping a block on the trash, then tapping another block, deleted that one too (owner, mobile)
- [x] 5. Patch files: `.blokdust` save/open/insert in the plugin (Patches panel, `~/Music/BlokDust/Patches`) and on the web (download, file picker, drop)
- [x] 6. Missing user files: Locate… button beside drop-to-relink
- [x] 7. Built-in presets
- [x] 7b. Patches panel review (owner, 2026-11-10): SAVE / OPEN tabs; SAVE TO COMPUTER with a save dialog; CREATE SHARE LINK → COPY LINK, stale link → CREATE NEW LINK / UPDATE LINK; OPEN and INSERT on every row; one FROM YOUR COMPUTER picker that asks Open or Insert (drops too); confirm before Open over unsaved changes; Insert places by hand (Esc, Cmd/Ctrl+Z); "+" in names
- [x] 7e. Patches and Settings review (owner, 2026-11-10): "Delete <name>?" wording; the plugin's SAVE tab gets CREATE SHARE LINK (made in the browser) instead of SHOW FOLDER; OPEN FROM YOUR DEVICE is the OPEN tab's main button; Patches remembers its tab; Settings loses Connect and "Chrome Recommended", About is rewritten, the footer links the code on GitHub; one Tempo in Settings (web) instead of one per synced block; the Stereo Delay syncs to tempo
- [x] 8. Multi-touch: pinch zoom, one block or slider per finger (UI-0006)
- [x] 9. Multi-select: click/box/touch, move/duplicate/delete together (UI-0007; owner 2026-11-11: an Insert is not selected)
- [x] 9b. Power switch (owner, 2026-11-11): bottom centre, Space on the web; off stops everything the world powers (UI-0008)
- [x] 9c. Owner review (2026-11-11): v1's play button to start; undo for deletes; a particle entering an emitter fires it (SIMULATION-0004); Save/About wording; power switch at v1 proportions; trackpad pinch zoom
- [x] 9d. Owner review (2026-11-11): v1's Splash ported (start button + intro), no jitter on START; web SAVE tab = SAVE · SAVE AS · DOWNLOAD PATCH, help lines gone, the link copies on click
- [x] 10. Hosting at funputs.com/blokdust (owner OK 2026-11-11, SHARING-0005): staging under /blokdust; funputs.com on the production Turnstile widget; production config + route `funputs.com/blokdust*`, live with the first production deploy after the merge (13)
- [x] 10b. Hosting moves to blokdust.funputs.com (owner, 2026-11-12, SHARING-0006): production and staging at the root; Custom Domain blokdust.funputs.com; funputs.com/blokdust* 302s to the same page there; plugin `PUBLIC_SITE` and installer URLs follow
- [x] 11. Credits + v1 MIT notice: About footer links the code (owner: licences are viewable there, no separate links); NOTICE.txt + LICENSE.txt in the web build and embedded in the plugins; credits in NOTICE.md and README (the owner's About wording)
- [x] 12a. PR #1 review (owner, 2026-11-12): hosting at blokdust.funputs.com (10b); no pricing or video-sharing idea in the roadmap; the Laser Sequence and Step Sequencer presets run on Power blocks, not `selfPoweredMode`; a click or touch skips the intro; the Share panel's save warning reworded
- [x] 12. Plugin distribution (PLUGIN-0005): version 2.0.0 everywhere; `bd plugin package` (universal macOS 11+ pkg, notarised and stapled); `bd win package` (unsigned Inno Setup installer, install/uninstall checked); `bd release publish` to downloads.funputs.com; Settings › DOWNLOAD (web). 2.0.0 published 2026-11-12, built from the PR #1 merge (cb433b2)
- [ ] 13. Owner review, merge, quiet launch

Notes:
- 1: v1 deletes every block, then checks CreateNew once (MainScene._Invalidate). We checked after each deletion: the
  second check stopped the panel's close tweens, so "CLEAR THE STAGE?" stayed open with the icon over the logo.
  `scene.ResetScene` now checks once. Test `clear-stage` (3 blocks; panel and icon state) failed, now passes.
- 2: ported from Funputs #45: `user-select`/`-webkit-user-select`/`-webkit-touch-callout: none` on the page (text
  fields keep theirs), and a non-passive `touchstart` on `#stage` that cancels Safari's long-press and double-tap
  recognisers. Test `ios-no-magnifier` pins the mechanism (no offline WebKit recogniser); confirm on a phone.
- 3: `navigator.audioSession.type = 'playback'` before the AudioContext (Safari 16.4+, as Funputs demo-runtime);
  `play-and-record` before asking for the mic. Test `ios-silent-switch` checks the order with a stand-in session.
  Older iOS (< 16.4) is not covered (the silent `<audio>` loop trick); add it only if needed.
- 4: Settings › Tour is an inert stand-in (v1 draws `Options[3]` by index). Test `tour-hidden` replaces the KNOWN
  `launch-tutorial`. **Bring the Tour back** with the tutorial port (or replace it with presets).
- 4b: the trash only updated its rollover on pointermove; a finger lifts and lands with no move between.
  `scene.pointerUp` now updates it from the release point. Test `touch-trash-once` (real touches via CDP) failed
  (the tapped block was deleted), now passes.
- 5: the header's Share slot reads PATCHES (web and plugin) and opens the Patches panel, assembled from v1's sample
  search panel (title field, bordered buttons, paged rows with a chevron, count, arrows, close) and the "YOUR FILE"
  up-arrow buttons. Rows: Open (the row) and INSERT (bordered). Top: SAVE PATCH and SHARE LINK (web, v1's Share panel)
  or SHOW FOLDER (plugin). Bottom: OPEN FILE, INSERT FILE (on a phone, a row of their own under v1's arrows).
  - Web: SAVE PATCH downloads `<title>.blokdust`; a `.blokdust` file dropped on the stage is inserted there.
  - Plugin: ~/Music/BlokDust/Patches (`plugin/src/PatchFiles.*`), native open dialog, drop a file on the editor to
    insert it; the processor merges Open/Insert and keeps loaded samples (`applyPatch`).
  - SPEC-PATCH-FORMAT-V2 R10. Tests: `patches-web`, `plugin-patches`, `presets-load`; `bd plugin test` "patch files:
    save, list, open/insert merge" (host test `--selftest-patches`). `bd ui` fixtures gain `v2Actions`: share-open
    reaches v1's Share panel through Patches › SHARE LINK.
  - Found while building it, fixed with tests: reopening the panel during its close animation was swallowed (it
    still owned input), and the header relabel left an own `fillText` on the canvas context.
- 6: while a sampler's file is missing, v1's LOAD NEW SAMPLE reads LOCATE FILE and opens the file picker (browser or
  plugin) instead of the sample search. Test `locate-missing-file`.
- 7: five presets in `web/src/patch/presets/`: Computer Keys + Tone + Envelope, MIDI Keys + Tone + Envelope,
  Microphone + Reverb + Recorder, Laser Sequence (a synced laser, one turn a bar, over 8 tones in C minor pentatonic),
  Step Sequencer (4 synced emitters on 1, 1/2, 2 and 1.5 beats into kick, hat, snare and bell, each with its own
  envelope). Checked with `bd render` (laser: 8 notes a bar; steps: 62 hits in 8 s, 4 connections).
- 7b: drawn only from v1 pieces: Settings panel title, tab bar and close; Share panel name field, Randomise Title,
  SAVE / SAVE AS half buttons, copy, URL box, saving spinner and back chevron; Connect's three buttons (confirm);
  the sample panel's rows and bordered buttons. v1's Share panel is no longer reachable, so the `bd ui` fixture
  `share-open` is retired (tools/ui `retired`). Browsers can't start a save dialog in a sub-folder they weren't given,
  so the web starts in Music and then remembers the folder last used for patches; Safari and Firefox have no save
  dialog and download as before. The plugin lists only the patches folder.
- 7c (owner, 2026-11-10, second pass): CREATE SHARE LINK first; changed link → SAVE (same link) with SAVE AS (new
  link) under it, in plain words; no hover marks on the bordered row buttons; OPEN FROM YOUR DEVICE with an upload
  mark; the web lists the patches this browser saved above the presets (local storage, one per title, newest first).
- 7d (owner, 2026-11-10): SAVE AS only while the patch has changed since its link (no repeat links of the same
  patch); a bin (v1's trash can, small) on the user's own patches, with a confirm; the sample panel's YOUR FILE reads
  UPLOAD FILE with the upload mark; both upload buttons are underlined on hover.
- 7e (owner, 2026-11-10):
  - Delete step: "DELETE <NAME>?", then the owner's line (web: the patches list only; local files and links untouched;
    plugin: the file goes to the Trash).
  - Plugin SAVE tab: SAVE TO COMPUTER first, then CREATE SHARE LINK in place of SHOW FOLDER. Turnstile (the server's
    bot check) only runs on the site's own address, not in the plugin's page, so the plugin opens the public site with
    the patch in the address (`?c=p…&t=…&share=1`, nothing uploaded yet); the site opens Patches on SAVE, one click from
    the link (`bd_openUrl`, https only; Settings links use it too). The plugin can't SAVE over that link later; the
    browser that made it can.
  - OPEN FROM YOUR DEVICE: v1's 420×40 GUIDE button (SAVE colour) under the list, with the upload mark.
  - Patches opens on the tab last chosen (local storage, web and plugin).
  - Settings: no Connect tab (its index kept as an inert stand-in, v1 addresses tabs by index); no "Chrome
    Recommended" (removed in the port, tools/v1/port-ui.ts REWRITES); About text from the owner; footer link "View the
    code on GitHub" (the repo must be public before launch). `bd ui` fixtures settings-open and theme-next mask the
    changed areas with the reason.
  - Tempo: Settings › Tempo (web) in Tour's row; the Tempo row on synced blocks is gone. In a DAW the host's tempo rules.
  - Stereo Delay: Tempo Sync with Delay in musical steps (1/32 to 1/2, triplets and dotted), at most 1 s; new delays
    start synced at 1/8 (v1's 0.25 s at 120 BPM). The delay memory grew from 0.5 s to 1 s, which moves the
    `stereo-effects` golden by float rounding only (max 1.6e-8 on 47 of 576,000 samples).
  - Guide rebuild noted in the roadmap.
- 8 (UI-0006): the first finger stays v1's one pointer; each further finger drags the block it lands on (powered
  while held, drawn pressed) or a slider of the open options panel; a second finger while the first drags the stage
  pinches (0.25×–4×, the midpoint stays over the same spot, pans with it). Safari's page zoom is blocked on the stage
  (`gesturestart`). Primary `pointercancel` now ends a drag (it was unhandled). Test: ui-regressions `multitouch`.
- 9 (UI-0007): Shift+click / Shift+drag box / touch hold-then-drag box; Cmd/Ctrl+A; drag moves all, Alt+drag copies
  all, Cmd/Ctrl+D duplicates, Delete or the trash deletes all; Esc, a stage tap or a plain click lets go. Selected
  blocks are ringed by their outline (moved out evenly, dashed, half strength). Tests: `multi-select`, `insert-touch`.
- 9b (UI-0008): `Command::WorldPower`; off, Power/Toggle blocks, emitters and lasers stop and particles vanish; held
  blocks, keys and MIDI still play. Not saved; a reopened plugin editor turns it back on. Tests: engine "World power
  off", ui-regressions `power-switch`.
- Plugin downloads (owner question, 2026-11-11): planned with task 12, as a DOWNLOAD tab in Settings on the web.
  About's "now available as a DAW plugin" links to it then.
- 9c: start screen = v1 Splash's iOS start button (Palette[7] triangle 100u × 200u on Palette[0]) with START in v1's
  header type (test `start-button`). Cmd/Ctrl+Z undoes deletes (Backspace/Delete, a selection, the trash; a block
  dropped on the trash comes back where it was picked up, with its sound) as well as the last Insert (test
  `undo-delete`). Particles that enter another emitter fire it (engine `R5b` tests; goldens unchanged). Power switch:
  v1's 60u row proportions, symbols level with + − and the trash, label above (UI-0008). Trackpad pinch: ctrl+wheel
  (Chrome, Firefox) and gesture events (Safari) zoom about the pointer (UI-0006; test `trackpad-pinch`).
- 9d: `bd v1 port-ui` now ports v1 `Splash.ts` (rewrites: no "Chrome Recommended"; START under the triangle; its
  audio-unlock module bridged, as v2 starts audio in the click and shows the button everywhere, v1 on iOS only).
  START → the intro → the stage takes input. The intro starts once the engine node exists, so the moment the page
  blocks (~0.1 s on a laptop, compiling the engine) falls on the still button; once moving, the worst frame measured
  17 ms (test `start-button`, `splash=1`; automated browsers skip the intro otherwise). SAVE tab: test
  `share-link-inline`; plugin SAVE tab unchanged.
- 10 (SHARING-0005): the Worker serves pages/API under BASE_PATH, redirects pre-move root links into it and keeps the
  root API; deployed envs serve the build from the asset store at /blokdust/ (`buildSite`); staging is at
  …workers.dev/blokdust/. Gate: `pnpm test:sharing:base`. Owner OK (2026-11-11): Turnstile widget `blokdust` now
  allows funputs.com (`bd server setup` adds an env's hosts); production: BASE_PATH /blokdust, PUBLIC_BASE_URL
  https://funputs.com/blokdust, route `funputs.com/blokdust*` (precedes funputs-site's Custom Domain there). Its
  workers.dev pages redirect to funputs.com; the API answers on both, so released plugin builds keep working.
  At 13: `bd server deploy --env production` creates the route; then `bd server smoke --env production`.
- 12a: presets: a Power block within 6 gu of the laser/each emitter and more than 6 gu from every sound (the
  laser's tones move from an 8 to an 11 gu ring to make room; its range, 20 gu, still reaches them). Test
  `presets-load` (block counts, nothing self-powered, both heard). Intro skip: `scene.skipSplash` stops the intro's
  tweens and clears the splash; a press after START but before the intro begins skips it as it starts. Test
  `splash-skip` (mouse mid-intro, touch straight after START: both under 2 s, failed at ~3.6 s before the fix).
- 10b (SHARING-0006, supersedes 0005 before it was deployed): production `BASE_PATH` "", `PUBLIC_BASE_URL`
  https://blokdust.funputs.com, assets = web/dist (no `buildSite` on deploy; only the local `based` env uses it).
  `LEGACY_BASE_PATH` /blokdust: its pages 302 to the public root (a landing page may replace that later), its API
  answers in place; staging the same, so old …/blokdust/ review links still open. Test `legacy-path`
  (`pnpm test:sharing`; smoke checks it on the deployed host). Local config: production PUBLIC_URL →
  https://blokdust.funputs.com, staging PUBLIC_URL → its workers.dev root. At 13: `bd server setup --env production`
  (adds blokdust.funputs.com to the Turnstile widget), then deploy (creates the Custom Domain and the route), smoke,
  and check funputs.com/blokdust by hand.
