---
id: CHG-0013
title: Post-launch fixes (2.0.2)
status: proposed
date: 2026-11-13
specs: [SPEC-PATCH-FORMAT-V2, SPEC-SIMULATION-POWER-AND-PARTICLES]
adrs: [PLUGIN-0002]
---
# CHG-0013: Post-launch fixes (2.0.2)

## Why
The owner's second list after launch (2026-11-13), from using the 2.0.1 standalone app: a first-launch patch, two
small annoyances, a share link that looked broken, Toggles that lost their state in a link, and a new preset.

## What changes
In the order they were done (the smallest first; the Toggle fix before the preset that needs it):
1. **POWER OFF** sat a pixel or two high in its red box: the letters are centred on their measured bounds
   (`web/src/v1ui/scene.ts`; test `power-off-label-centred`, 10 px above / 12 px below at 2× before, 11 / 11 now).
2. **No macOS alert sound for held keys** in the app: WKWebView passes on every key the page doesn't cancel, and the
   page let key repeats through, so a held note key sounded the alert on every repeat. Repeats of a captured key are
   cancelled too; the standalone app (the editor tells the page, `bd_patch.standalone`) keeps every plain key outside a
   text field, as it has no DAW to pass them to; Cmd/Ctrl shortcuts still reach the menus. In a DAW, keys BlokDust
   doesn't use still go to the DAW. Test `plugin-key-repeat-no-beep`.
3. **Toggles keep their state** (SPEC-PATCH-FORMAT-V2 R2b): the engine flips a Toggle on each hit but the page's patch
   never heard, so a save or link kept whatever was set by hand (the owner's two opposite Toggles came back the same).
   Web: the worklet reads the Toggle's state with each Logic event (`bd_block_param`, a new WASM export) and the page
   writes it into the patch; the autosave catches up within a second; not an unsaved change. Plugin: the snapshot
   carries every Toggle's state; the editor writes changes into the processor's patch (the DAW project) and the page
   (`syncToggles`). As v1 (Toggle `Params.logic`). Test `toggle-state-saved`. Engine behaviour and goldens unchanged.
4. **Share link from the app**: the site opened the Patches panel at once (its title showed over the start screen) and
   left the user on it after START, a click away from the link. Now the site makes the link as it loads (the user
   asked for it in the app), the address bar shows the short link, and START shows the scene. The app's line under
   CREATE SHARE LINK says "ready to copy". Tests `share-from-plugin`, sharing `share-from-app`.
5. **Self Playing Scene preset** (`web/src/patch/presets/06-self-playing-scene.blokdust`): the owner's scene from the
   link, its two Toggles opposite so the chords take turns (`b27` on). Test `presets-load`.
6. **The app's first patch is the Rotating Sequencer** (owner: a simple patch to start from). The scene the owner saw
   was their own last session: JUCE's standalone wrapper saves the plugin state on quit and restores it at launch
   (`~/Library/Application Support/BlokDust.settings`; Options › Reset to default state clears it). The instrument in a
   DAW still starts empty and FX with Audio In (CHG-0010 5).
7. Version 2.0.2.

## Out of scope
- Space as the power switch in the standalone app (it is the DAW's transport key in the plug-ins).

## Acceptance
- `pnpm test:ui-regressions` (all; new or changed: `power-off-label-centred`, `plugin-key-repeat-no-beep`,
  `toggle-state-saved`, `share-from-plugin`, `presets-load`, which failed before their fixes).
- `pnpm test:sharing` (new `share-from-app`).
- `pnpm bd wasm test`, `pnpm bd render --check --configs release,dev` (goldens unchanged), `pnpm test:engine`,
  `pnpm test:web`, `pnpm bd plugin test`, `pnpm check`, `pnpm bd privacy check`.
- Standalone first launch with no saved settings: the system log reads `page: ready, 10 blocks` (Rotating Sequencer).

## Risks and unknowns
- The alert sound and the plugin's Toggle sync need the owner's check in the real app (no automated WKWebView test).
- In the plugin a Toggle flipped while the editor is closed reaches the DAW project when the editor next opens.
