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
- [x] 9. BlokDust FX as a second AUv3 in the same app.
      2026-11-16: `BlokDust FX.appex` is embedded beside `BlokDust.appex` (`XCODE_EMBED_APP_EXTENSIONS`); on iPad its
      ID is `com.funputs.blokdust.fx` (extension `com.funputs.blokdust.fx.fxAUv3`), as an embedded extension's ID must
      start with the app's. It registers as `aufx Bdfx Bldt` (same codes as desktop) and shares the App Group.
      `bd plugin ios test` loads it out of process and renders `fx-audio-in` with its sine fed in: ≡ golden, state
      round-trips.
- [ ] 10. Device: signing setup (local config), `plugin-ios` preset, install on the owner's iPad; CPU/memory check.
      2026-11-16 (in part): `plugin-ios` preset (iphoneos, automatic signing, team from local config) and
      `pnpm bd plugin ios device [--no-build]` (build with `-allowProvisioningUpdates`, install on the paired iPad with
      `devicectl`). The device build compiles (arm64, iPadOS 16+, both extensions; checked with signing off). Waiting
      on the owner: the team's Apple account in Xcode on the build Mac (Xcode then registers the App IDs, the App Group
      and the iPad), and an iPad paired with Developer Mode on. Then: install, CPU/memory check.
- [ ] 11. Owner review in AUM, GarageBand, Logic for iPad, Cubasis.
- [x] 12a. Licensing: JUCE 8 Starter for the App Store build (LICENSING-0003); bundle IDs under `com.funputs`; iPad only.
- [ ] 12b. App Store Connect / TestFlight setup (owner).
