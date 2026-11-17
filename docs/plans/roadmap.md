# Roadmap

No deadline: we work phase by phase and each phase merges to `main` only when its exit criteria pass. The plan **front-loads the pipeline**: tools, codegen and verification. After that, each block is mostly "manifest + DSP class + a passing visual/golden test", work that agents can grind through unattended.

**Branching:** each phase is developed on `phase-N` (starting with `phase-0`) and merged to `main` when its exit criteria pass and the owner has reviewed it.

| Phase | Goal | Exit criteria |
|---|---|---|
| **0. Spikes + harness** ([CHG-0001](../specs/changes/0001-phase-0-architecture-spikes/proposal.md)) ✅ merged 2026-11-06 | Prove engine/WASM/plugin/Pixi bets; build verification tools | CHG-0001 acceptance passes |
| **1. Core parity (web)** ([CHG-0002](../specs/changes/0002-phase-1-core-parity-on-the-web/proposal.md)) ✅ merged 2026-11-07 | v1 stage, chrome (menus, hover/selected states, Dust right-click assignment UI) and the **core block set** on the web with a real effect graph (rewiring crossfades, SPEC-CONNECTIONS R5), local save, URL-fragment sharing | Visual parity for all core blocks in theme 0; golden audio for each; e2e "build a patch and hear it" |
| **2. Sharing + embeds** ([CHG-0003](../specs/changes/0003-phase-2-sharing-and-embeds/proposal.md)) ✅ merged 2026-11-07 | Worker + D1 save/load, `/embed`, oEmbed, OG thumbnails, user-file and Freesound sample references (DATA-0005) | Share → open in a fresh browser → identical render hash; embed plays in a test page |
| **3. Plugin** ([CHG-0004](../specs/changes/0004-phase-3-plugin/proposal.md)) ✅ merged 2026-11-08 | VST3/AU/Standalone, instrument + FX (Audio In), tempo sync, state, Dust 1–8 automation (PLUGIN-0003), drag-in DAW audio files, **Granular** (the headline use of a user's own audio) | pluginval; renders headless; tested in Logic, Live, Reaper, Bitwig |
| **4. MCP App** (deferred 2026-11-08) | MCP server, layout solver, validate/render, in-chat player | "dreamy synth with slow filter" produces a valid, audible patch in Claude and ChatGPT |
| **5. Completion** (deferred 2026-11-08, except the iPad AUv3) | Remaining blocks (Recorder, SampleGen; Convolver, PitchShifter, AutoWah, Chomp, Chopper landed in Phase 1), all 13 themes, iPad AUv3, new physics blocks via the library | Full parity; App Store build |

**Release plan (owner, 2026-11-08):** Phases 4 and 5 are deferred. Instead:
1. **Release 1** ([CHG-0005](../specs/changes/0005-release-1/proposal.md), branch `release-1`): what the web and plugin need before real users: patch files and presets, mobile fixes and multi-touch, multi-select, hosting at blokdust.funputs.com, credits, plugin installers.
2. **Quiet launch:** website + free plugins live at blokdust.funputs.com (funputs.com/blokdust redirects there), no announcement; real users find bugs.
3. **iPad AUv3** ([CHG-0025](../specs/changes/0025-ipad-auv3/proposal.md), branch `feat/ipad-auv3`), then the **main launch**: iPad, website and plugins announced together.
4. **Post-2.0 blocks** (owner, 2026-11-13, [SCOPE-0005](../decisions/scope/SCOPE-0005-the-post-2-0-block-set.md)): designed in `pnpm bd block-designer`, built in this order:
   CHG-0014 Compressor + emitter Offset, CHG-0015 Counter/Chance/Prism, CHG-0016 Sound Laser, CHG-0017 Keys set pitch + note effects,
   CHG-0018 LFO, CHG-0019 Touchpad (the Push-style grid replaces the XY pad idea; Touch Keys dropped), CHG-0020 Labels, CHG-0021 Stage block.
   XY Pad and Wall are parked. Next: CHG-0032 Gate (owner, 2026-11-17).
5. **Rebuild the BlokDust guide** (owner, 2026-11-10): guide.blokdust.com was a WordPress site the owner can no longer reach, and it has been hacked, so Settings no longer links it (Connect tab removed). A future agent task: collect the guide's text and images (archived copies, e.g. the Wayback Machine, not the hacked site) and make a static site that becomes the new guide.

**Core block set (Phase 1):** Tone, Noise, Microphone/AudioIn, Sample (user file / Freesound), Filter, EQ, Volume, Reverb, StereoDelay, Distortion, BitCrusher, Chorus, Phaser, Envelope, Vibrato, Power, Toggle, Pulse, Emitter, Laser, Void, ComputerKeyboard, MIDIController (Microphone and AudioIn share an implementation).

## Deferred or rejected
- Macros: deferred (SCOPE-0002), now proposed as the Stage block (SCOPE-0006, CHG-0021). Custom DSP blocks: rejected (SCOPE-0001). Accounts, gallery, moderation: deferred (SCOPE-0003). MP4 social previews: deferred until funded (SHARING-0002).
