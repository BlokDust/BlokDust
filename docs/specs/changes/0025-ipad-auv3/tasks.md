# CHG-0025 tasks: iPad AUv3

Check items off as they land. Each task should be independently verifiable.

- [x] 1. iOS build: `plugin-ios-sim` preset (Xcode generator), iPadOS 16+ default, iOS branch in
      `plugin/CMakeLists.txt` (AUv3 + Standalone container, iPad only, launch storyboard), AppKit code guarded
      (`WebViewDrops.mm`). Builds `BlokDust.app` with `PlugIns/BlokDust.appex`; the extension registers as `aumu Bdst Bldt`.
- [x] 2. iOS AUv3 test host (Simulator app, output-only session): load the extension by component description,
      render the golden fixtures via state (≡ native hashes), state round-trip, open its view and wait for `bd_ready`.
- [x] 3. `pnpm bd plugin ios build|test` (tool + `tool.json`, `pnpm bd index`): boot a Simulator, install, run task 2,
      JSON result. 2026-11-15: both fixtures ≡ native through the out-of-process AUv3, state round-trips, page
      `ready, 6 blocks` (`plugin/tests/ios-host/main.mm`, `tools/plugin/ios.ts`). Still to do: add it to `bd ci`.
- [ ] 4. Container app without a microphone prompt: output-only session for the instrument (JUCE's iOS device always
      activates `PlayAndRecord`, which also deadlocks the Simulator); the app opens BlokDust full screen.
- [ ] 5. Patches on iPad: App Group container shared by app and extension; Files app visibility; Save/Open through the
      document picker; Delete without a Trash.
- [ ] 6. Samples on iPad: document picker, security-scoped access, copy into the container, relink by name.
- [ ] 7. Links: `bd_openUrl` in the extension (no `openURL` from extensions): hide or replace those buttons in the
      iPad plugin page.
- [ ] 8. Editor on iPad: touch in WKWebView (Release 1 multi-touch), host view sizes (AUM, GarageBand, Logic for
      iPad), safe areas, no hardware keyboard.
- [ ] 9. BlokDust FX as a second AUv3 in the same app.
- [ ] 10. Device: signing setup (local config), `plugin-ios` preset, install on the owner's iPad; CPU/memory check.
- [ ] 11. Owner review in AUM, GarageBand, Logic for iPad, Cubasis.
- [ ] 12. Licensing decision (LICENSING-0002) and App Store/TestFlight setup (owner).
