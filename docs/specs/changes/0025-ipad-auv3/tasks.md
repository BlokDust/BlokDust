# CHG-0025 tasks: iPad AUv3

Check items off as they land. Each task should be independently verifiable.

- [x] 1. iOS build: `plugin-ios-sim` preset (Xcode generator), iPadOS 16+ default, iOS branch in
      `plugin/CMakeLists.txt` (AUv3 + Standalone container, iPad only, launch storyboard), AppKit code guarded
      (`WebViewDrops.mm`). Builds `BlokDust.app` with `PlugIns/BlokDust.appex`; the extension registers as `aumu Bdst Bldt`.
- [x] 2. iOS AUv3 test host (Simulator app, output-only session): load the extension by component description,
      render the golden fixtures via state (≡ native hashes), state round-trip, open its view and wait for `bd_ready`.
- [x] 3. `pnpm bd plugin ios build|test` (tool + `tool.json`, `pnpm bd index`): boot a Simulator, install, run task 2,
      JSON result. 2026-11-15: both fixtures ≡ native through the out-of-process AUv3, state round-trips, page
      `ready, 6 blocks` (`plugin/tests/ios-host/main.mm`, `tools/plugin/ios.ts`). 2026-11-16: in `bd ci` (job `ios`, skipped without an iOS Simulator runtime).
- [x] 4. Container app without a microphone prompt: output-only session for the instrument (JUCE's iOS device always
      activates `PlayAndRecord`, which also deadlocks the Simulator); the app opens BlokDust full screen.
      2026-11-16: our own app (`plugin/src/ios/ContainerApp.mm`, `JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP`) runs the
      processor from an AVAudioEngine source node on a `Playback` session (mixes with other apps), opens every MIDI input,
      restarts after interruptions and route changes, and saves the patch when it leaves the foreground. No
      `NSMicrophoneUsageDescription` on iPad (app or extension); Audio In is silent in the app. `bd plugin ios test`
      checks it on a fresh install: Playback session, sound at the output, first-launch patch (10 blocks), saved in the
      background and restored on relaunch. Left for task 8: the status bar still shows; the editor's resize corner.
- [x] 5. Patches on iPad: App Group container shared by app and extension; Files app visibility; Save/Open through the
      document picker; Delete without a Trash.
      2026-11-16: `group.com.funputs.blokdust` (`BLOKDUST_APP_GROUP`) holds BlokDust/{Patches,Recordings,SampleGen}
      (`patchfiles::root()`); the app's Documents if the group is missing. The App Group is not browsable in the Files
      app, so Files is reached through the picker: SAVE TO COMPUTER exports a copy, FROM YOUR COMPUTER reads the picked
      file; the bin deletes outright. `bd plugin ios test` puts a patch in the group and both the app and the extension
      must list it. Not automated: the picker flows themselves (check on the iPad, task 11). Device builds need the
      group registered in the owner's team (task 10).
- [x] 6. Samples on iPad: document picker, security-scoped access, copy into the container, relink by name.
      2026-11-16: a picked file is copied (off the message thread) into the App Group's BlokDust/Samples, reusing a
      same-named copy with the same fingerprint, and the patch references the copy (`SampleLoader::copyIn`). A patch
      whose file is missing also looks in Samples by name. `bd plugin ios test` loads a patch from another machine
      (its path exists on no iPad) with the WAV in Samples: the extension relinks it and renders ≡ native. Not
      automated: the picker itself (task 11). The Recorder's download exports the take through the picker (no Finder).
      Every picker is parented to the editor on iPad (`pickerParent`): JUCE never opens an AUv3's picker without one.
      Left for task 8: no file drops on iPad.
- [x] 7. Links: `bd_openUrl` in the extension (no `openURL` from extensions): hide or replace those buttons in the
      iPad plugin page.
      2026-11-16: replaced, not hidden. In the extension a link (About, the code, CREATE SHARE LINK's site page) is
      copied to the clipboard and a native "Link copied" alert says to paste it into Safari; the app opens links as
      usual. The page learns it runs on iPad (`bd_patch` `ios`): the patch bin says the file will be deleted, not moved
      to the Trash. Not automated (the host cannot press page buttons): check on the iPad (task 11).
- [ ] 8. Editor on iPad: touch in WKWebView (Release 1 multi-touch), host view sizes (AUM, GarageBand, Logic for
      iPad), safe areas, no hardware keyboard.
      2026-11-16 (in part): the editor has no resize corner on iPad and a 320×240 floor (hosts size the view); the app
      is a kiosk window (no status bar, home indicator hides) inset from the safe area. `bd plugin ios test` also
      shows the view at an AUM-like 480×320 (`.cache/ios-host/editor-small.png`, for review): the page lays out.
      Left: touch inside the extension (the page's touch handling is Release 1's, tested in iPad Safari) and real
      host sizes, both on the iPad (task 11).
      2026-11-16, first iPad review (GarageBand): touch, the on-screen keys and a MIDI keyboard work. Above GarageBand's
      keyboard the view is ~1000×290 pt and v1's width-only unit made panels taller than it (the Patches name field
      covered OPEN, Settings rows ran into the tabs). Past 2:1 the height now sets the unit, for the chrome
      (`Metrics.ts` via `bd v1 port-ui`) and the stage (`stage/metrics.ts` `MAX_ASPECT`); views up to 2:1 (every v1
      reference, 16:9) are unchanged. Test: `short-wide-view`. Snapshots go to the page on the display's refresh at up
      to 60 a second (they were 30; the web worklet sends ~60), and the page reports its frame and snapshot rates to
      the plugin log. The iPad app icon is full-bleed (`assets/app-icon-ios.svg`; the macOS one's margin showed white).
      Second pass: the log showed 60 fps but 34 snapshots a second; the processor published one per 1/30 s of audio.
      It now publishes per 1/60 s of audio: 60/60 measured on the iPad. In the extension (it can't open Safari) the
      page shows no links: no "View the code on GitHub", no websites or Twitter names in About (`hideLinks`, test
      `ipad-extension-no-links`); the app keeps them. On iPad (app and extension) CREATE SHARE LINK opens the share
      menu (JUCE ContentSharer, `bd_share`) with the self-contained `?c=p…` link: a short link needs the site's bot
      check, which the plugin can't run. The menu is a popover at the button (`shareLink`, WebViewDrops.mm): JUCE's
      ContentSharer opened a page sheet the size of the view (owner: hard to close). DAW plugins get the power
      switch's HOST cell (UI-0015).
- [x] 9. BlokDust FX as a second AUv3 in the same app.
      2026-11-16: `BlokDust FX.appex` is embedded beside `BlokDust.appex` (`XCODE_EMBED_APP_EXTENSIONS`); on iPad its
      ID is `com.funputs.blokdust.fx` (the extension too since 2026-11-20: the App Store refused JUCE's `…fx.fxAUv3`), as an embedded extension's ID must
      start with the app's. It registers as `aufx Bdfx Bldt` (same codes as desktop) and shares the App Group.
      `bd plugin ios test` loads it out of process and renders `fx-audio-in` with its sine fed in: ≡ golden, state
      round-trips.
- [ ] 10. Device: signing setup (local config), `plugin-ios` preset, install on the owner's iPad; CPU/memory check.
      2026-11-16 (in part): `plugin-ios` preset (iphoneos, automatic signing, team from local config) and
      `pnpm bd plugin ios device [--no-build]` (build with `-allowProvisioningUpdates`, install on the paired iPad with
      `devicectl`). The device build compiles (arm64, iPadOS 16+, both extensions; checked with signing off). Waiting
      on the owner: the team's Apple account in Xcode on the build Mac (Xcode then registers the App IDs, the App Group
      and the iPad), and an iPad paired with Developer Mode on. Then: install, CPU/memory check.
      2026-11-16: installed on the owner's iPad Pro (M4). The build targets the paired iPad (generated schemes,
      `-destination id=…`), so automatic signing registers it. `pnpm bd plugin ios log` copies the plugin's log from
      the App Group (the iPad keeps one there: `Logs/blokdust.log`); devicectl cannot read an App Group on a device,
      so the app copies it to its own `Library/Logs` when it opens, and the tool reads that. Left: CPU/memory.
- [ ] 11. Owner review in AUM, GarageBand, Logic for iPad, Cubasis.
- [x] 12a. Licensing: JUCE 8 Starter for the App Store build (LICENSING-0003); bundle IDs under `com.funputs`; iPad only.
- [ ] 12b. App Store Connect / TestFlight setup (owner).
      2026-11-20: `pnpm bd plugin ios archive [--build N] [--upload]` (tools/plugin/ios-release.ts): the live site,
      build/plugin-ios-release, build number = UTC YYYYMMDD.HHMM, ITSAppUsesNonExemptEncryption false (checked in
      `bd plugin ios test`, failing first), archive checks (versions, extensions, privacy manifests, iPad only), export
      or upload. First archive passed its checks; export needs the App Store Connect API key (owner). Owner: app record
      (SKU blokdust-ipad, Full Access), API key, then the first upload on their go.
      2026-11-20: 2.1.0 (20261121.0239) uploaded by the owner from Xcode on the build Mac: the App Store refused the FX
      extension's two-part ID (now com.funputs.blokdust.fx), and an API key can't read App Groups, so a new ID's first
      profiles need Xcode's own account once. Since then `bd plugin ios archive` signs all three bundles from the
      command line. Upload warnings: no dSYMs (fixed: preset adds -g, the tool copies each bundle's dSYM into the archive
      and checks its UUIDs); built with the iOS 26.5 SDK (Xcode 27 needed from April 2027).
- [x] 12c. Privacy: one usage-stats switch and install id per iPad (App Group; SPEC-SHARING-USAGE-ANALYTICS R8, test
      in `bd plugin ios test`), the ping to the page's server, `PrivacyInfo.xcprivacy` in the app and both extensions;
      then on the iPad: one ping a day on staging, none after switching off in the app or in a host.
      2026-11-20: built: `usage-stats.settings` + a lock file in the App Group, the ping sent from the page's bd_ready
      to its `events` URL (none from the Simulator), the manifest in all three bundles; `bd plugin ios test` checks
      both (written failing first). Installed on the owner's iPad (review build → staging).
      Owner's iPad check: one ping a day across the app and GarageBand (staging: one `auv3` event). Switching off in
      GarageBand left the app, still running, showing on: the page now reads plugin values by name (bd_get → bd_values,
      web/src/app/pluginValues.ts) at start and once per focus return (onFocusReturn, web/src/app/focus.ts; owner: no
      polling, and a general mechanism for later values such as the newest version); SPEC R7; `bd plugin ios test`
      flips the file while the app is in the background.
      Owner's second iPad check passed (2026-11-20). GarageBand shows as host "Unknown" (an AUv3 can't see its host).
