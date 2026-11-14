# CHG-0004 tasks: Phase 3 plugin

- [x] 3.1 MPE ADR + engine per-note expression (bend ±48 st, pressure, slide/CC74), MPE zone parser shared by web + plugin; engine tests + golden MPE fixture (native ≡ WASM ≡ worklet ≡ plugin)
- [x] 3.2 MIDI Input block: channel (Omni/1–16) everywhere, device (All/named) on the web, MPE switch + per-block expression mapping; v1-style selector options; Web MIDI test with a virtual port
- [x] 3.3 Host-aware labels (manifest `labels`): Audio Input / MIDI Input in the plugin; Audio Input carries track audio (FX) or side-chain (instrument)
- [x] 3.4 Two plugin variants (instrument, FX) × VST3/AU/Standalone; pluginval + auval for all
- [x] 3.5 Host tempo + transport (SIMULATION-0003): beat-synced emitter/pulse/laser, transport start/stop; golden fixture
- [x] 3.6 State in the DAW project; file refs with absolute/relative path + fingerprint; relink search + prompt
- [x] 3.7 Drag audio files in (Finder/DAW) onto samplers or the stage; background decoding
- [x] 3.8 Granular grain engine (v1 GrainPlayer parity, `bd v1 audio` reference) + MPE expression; `granular-plays` leaves KNOWN
- [x] 3.9 Dust 1–8: host lane names, automated editor-assignment test, MIDI CC learn
- [x] 3.10 DAW smoke tests: REAPER scripted (macOS + Windows VM), Logic, Live; owner review in DAWs
- [ ] (moved) v1 tutorial port → later (owner, 2026-11-08: the Tour button is hidden for Release 1, CHG-0005); KNOWN `launch-tutorial` stays

Notes:
- 3.1:
  - Engine `NoteExpression`. Each voice keeps its channel, bend, pressure gain and slide filter.
  - `engine/tests/test_mpe.cpp`: 8 exact comparisons.
  - `mpe.hpp` (C++, allocation-free, with `MidiRouter`) and `web/src/input/mpe.ts` both run `tests/mpe/*.json` (3
    streams: 161 C++ assertions, plus the web runner).
  - Goldens `mpe` (script) and `mpe-midi` (a raw stream) match across native, WASM and the worklet. The plugin
    renders the raw stream through its own parser identically (`bd plugin test` "host MPE MIDI").
- 3.2:
  - Web MIDI arrives with its device. Each block runs its own parser, filtered by device.
  - New options use v1's option types: switches for MPE, Pressure and Slide; sliders with a v1 `convertDisplay`
    readout for Channel, Device and Bend.
  - Test: ui-regressions `midi-input-options`, with a fake Web MIDI of two inputs.
  - v1 diff `options-MIDIController`: the panel area is masked, with the reason recorded.
  - A real IAC/Funputs check is left for owner review.
- 3.3:
  - Labels live in `PLUGIN_LABELS` (`web/src/v1ui/shim.ts`) rather than in manifests: they relabel v1's menu and l10n
    data and the forms' hard-coded titles.
  - ui-regressions `plugin-labels` uses a fake JUCE backend. It also checks that the website keeps v1's names.
- 3.4:
  - The instrument has a stereo side-chain input, off until the host enables it, and it feeds Audio Input.
  - `bd plugin test` "Instrument: side-chain → Audio Input" renders identically to the FX golden.
  - pluginval (VST3 ×2) and auval/pluginval (AU ×2) pass. The Standalone builds with JUCE's device settings.
- 3.5:
  - Engine tempo and beat clock, synced Emitter and Pulse. `engine/tests/test_tempo.cpp`: grid timing, tempo
    change, transport jump, unsynced timing unchanged.
  - Goldens `tempo-sync` (patch tempo and script tempo/transport changes) and `tempo-host`: the plugin with a playing
    host transport at 120 BPM ≡ native.
  - Panels: Tempo Sync switch; Division, Length and (web) Tempo in musical steps. ui-regressions
    `tempo-sync-options`. v1 diff `options-ParticleEmitter` masks the taller panel.
  - Bug found and fixed test-first: the Pulse length slider did nothing (the engine used a fixed 0.15 s). The engine
    test failed at 0.5 s → 0.15 s and now passes.
- 3.6:
  - The processor owns plugin samples (`plugin/src/Samples.*`): files by path; Freesound previews downloaded natively,
    with a Range request for the Convolver; decoding on a background pool; v2's default sounds; the latest request
    wins.
  - The patch keeps `track` and `refs`, with the absolute path and the same fingerprint as the web.
  - Restoring a project reloads every sampler. A moved file is relinked by name beside its last folder.
  - `Engine::prime()` lets samples attach before the first block.
  - Render tool fixtures can carry `samples` (WAV).
  - `bd plugin test`: "state: Sample with the user's file" and "state: moved file relinked by name" both render
    identically to native.
  - The plugin UI shows the processor's reports (ui-regressions `plugin-samples`). Freesound search in the plugin uses
    the public site's API, with CORS on the Freesound endpoints.
  - Sharing from the plugin uses `?c=p…` links: Turnstile only accepts our site's origin.
- 3.7:
  - On macOS the WKWebView stops claiming file drags, so drops reach the editor with their paths. The page picks the
    sampler under the drop, or creates a Sample there, and the processor loads the file. The JS side is covered by
    `plugin-samples`; the Finder/DAW drag is for owner review.
  - Windows: drops go to the page (this session only) until the WebView2 controller is reachable.
- 3.8:
  - Engine `renderGranular`: v1 GrainLoop timing and grain envelope, with a per-block seeded stream. MPE pressure sets
    the volume and slide sets the grain position.
  - `engine/tests/test_granular.cpp`: 5 cases.
  - `bd v1 audio` gains `stepped` (10 ms steps with v1's timers running) and `files` (WAVs served for v1's dead URLs).
  - granular passes `bd audio compare` (level 0.23 dB, centroid 0.5%, bands 0.5 dB; envelope and f0 loosened for
    randomness, with the reason recorded).
  - Chomp's harness known failure is gone: stepped capture, with band and envelope limits noted.
  - ui-regressions `granular-plays` passes and has left KNOWN.
- 3.9:
  - `DustParameter` names follow assignments ("Dust 1 · Filter · Gain"), with `updateHostDisplay`.
  - MIDI learn: the Dust menu's LEARN MIDI CC binds the next CC, saved as `cc` in the automation entry. Bound CCs drive
    their slot sample-accurately and move the host lane.
  - `bd plugin test`: lane name check, and CC 20 = 127 ≡ lane 1.0.
  - ui-regressions `dust-menu` (fake JUCE) covers the editor menu, which CHG-0002 1.12 noted had no test.
- 3.10 (2026-11-07: `bd win plugin` green, with REAPER mpe/fx/state passing on Windows):
  - REAPER (Windows VM, `bd win plugin`, tools/reaper/__startup.lua modes): instrument plays; an MPE MIDI item on
    member channels with per-note bend and CC74 plays; BlokDust FX on a JS tone generator; a project saved and
    reopened with Dust 1 set.
  - Bug found by that check, test first: Dust 1–8 values were not in the plugin's saved state, so they came back as 0.
    `bd plugin test` "state keeps Dust 1-8 values" failed [0,…] and passes now: the state carries `plugin.dust`
    beside the patch.
  - REAPER stays Windows-only (owner, 2026-11-07: no licence). On macOS (`bd plugin reaper`) it is blocked: REAPER here is unregistered, and its start-up dialog stops both
    scripts and command-line renders (no accessibility access to dismiss it). Waiting on the owner.
  - 2026-11-08: unblocked on the M4. The real blocker was REAPER's "no audio device selected" question on a fresh
    config; the test `reaper.ini` now names the default CoreAudio devices. `bd plugin reaper` passes 4/4 (instrument,
    MPE item, FX through Audio In, project reopen with Dust 1).
  - Owner reviews 1–3 in Logic and Live: all findings fixed (sections below); owner signed off Phase 3 on 2026-11-08.
  - Logic Pro and Ableton Live 12: manual checklist below, for owner review.

### Manual DAW checklist (owner review: Logic Pro, Ableton Live 12)
1. **Instrument:** insert BlokDust (AU in Logic, VST3 in Live) on a MIDI track. The editor shows the stage, and the
   demo patch sounds when transport plays.
2. **MIDI Input:** play notes from a MIDI keyboard on the track. With MPE on (MIDI Input options), an MPE controller
   (e.g. Funputs over a virtual port, or Logic's MPE-enabled track) bends, swells and brightens single notes.
3. **Tempo sync:** an Emitter with Tempo Sync on, Division 1/8, fires on the grid when the DAW plays at 90 and 140 BPM.
4. **Effect:** insert BlokDust FX on an audio track. The Audio Input block carries the track; a Reverb next to it is
   heard.
5. **Side-chain** (Logic): route a track to the instrument's side-chain; Audio Input carries it.
6. **Samples:** drag a WAV from Finder onto the stage (a Sample appears and plays) and onto a Granular (grains of
   it). Save the project, quit, reopen: both samples come back. Move the WAV to a sibling folder and reopen: it is
   found again.
7. **Dust 1–8:** right-click a slider → DUST 3. The DAW's automation lane is named "Dust 3 · …" (Live shows it;
   Logic may keep "Dust 3"). Automate it, and LEARN MIDI CC → move a knob.
8. **State:** set Dust values, save, reopen: the values and the patch come back.

### Owner review 1 (2026-11-07: Logic on the MBP, web). Each bug got a failing test before its fix.
- **MPE (Logic, a real MPE keyboard):**
  - Notes went silent after a while. Each channel kept its released note's last pressure (0), and the next note on
    that channel started from it, until every channel was spent. Pressure now belongs to its note, in both parsers.
    Tests: `tests/mpe/stale-pressure.json`; engine "after many notes … a new note still sounds" (old code: rms 0.0).
  - Pressure crackled and swallowed the strike. A note now starts at a velocity floor (0.3 + 0.5 × velocity), and
    pressure swells it to full. Gain changes glide over about 5 ms. Tests: "pressure swells the note…" and "pressure
    changes glide, no zipper crackle" (fails without the glide).
  - Bend range is ±48 semitones by default; the readout now says "±48 ST".
  - golden-update: mpe, mpe-midi.
- **Keys in a DAW:**
  - Logic Musical Typing sent note-ons only while the plugin window had focus: WebKit passes unhandled key-downs to the
    host but drops key-ups. `KeyUpsToHost` (WebViewDrops.mm) now forwards key-ups to the host view. Manual check in
    Logic; not automatable here.
  - Computer Keyboard blocks also play from the host's MIDI notes (Musical Typing, Live's Computer MIDI Keyboard).
    Test: `bd plugin test` "DAW keys → Computer Keyboard".
  - With a Computer Keyboard in the patch, its note keys are BlokDust's while the editor has focus (no DAW
    shortcuts). Test: ui `plugin-keys-capture`.
  - Web: held keys release when the tab loses focus. Test: ui `keys-release-on-blur`.
- **Bypassed or disabled plugin (Logic):** blocks could not disconnect, and lines drew past the boundary. Bypassed,
  the world keeps running, with silent (instrument) or dry (FX) output. With no audio callbacks at all, the editor's
  timer runs the world. Tests: `bd plugin test` "bypassed: the world keeps running" and "no audio callbacks: the
  editor still ticks the world".
- **No Share in the plugin:** the DAW project saves the scene. Test: ui `plugin-no-share`.
- **Recorder and SampleGen in the plugin:**
  - Recorder records the processor's output and writes a WAV to ~/Music/BlokDust/Recordings. The WAV loads as the
    block's file, so the project keeps it like any user file (DATA-0005: local, never uploaded). Its download button
    shows the file.
  - SampleGen's generated sound goes to the processor, which saves it to ~/Music/BlokDust/SampleGen. A reopened
    project plays it without regenerating.
  - Test: ui `plugin-recorder-samplegen`. Recording itself is a manual check in Logic.
- **Spinners:** picking a new Granular or Convolver sound now clears the old waveform, so the loading square spins
  (web and plugin). Tests: ui `granular-loading-spinner`, `plugin-convolver-spinner`.
- **Granular waveform:** `GetDuration()` was 0 (no buffer), so the LOCATION slider had no lines and could not be
  dragged. A new sound now puts the spawn point half way, as v1 does. Spread widens the lines, and dragging moves the
  spawn point and shows the time. Test: ui `granular-waveslider`.
- **Emitters fire only when powered:** the demo's two emitters used v1's hidden self-powered mode. They are now powered
  by Power blocks. golden-update: demo. Test: ui `emitter-only-when-powered`.
  - A held key powering an Emitter or Laser changes v1's connection rules; asked the owner, who approved it (done in
    owner review 2 below).
- **Tempo sync (owner):**
  - New Emitters and Pulses from the menu start synced; saved patches without the setting keep v1 timing.
  - Rows: Angle, then Tempo Sync. Synced, Division (with triplets 1/16T, 1/8T, 1/4T, 1/2T) and Swing replace Fire
    Rate and P. Speed. Swing makes every second emission late by up to a third of a division.
  - Pulse: Length replaces Pulse length.
  - New: Laser Tempo Sync. Turn (↺ … ↻, 1/16 note to 16 bars per turn) replaces Rotate.
  - Tests: engine "triplet divisions", "swing…", "a synced laser turns…"; ui `tempo-sync-options`.
- **New: playback lines.** While a sampler's options are open, its waveform shows a line per sounding voice (Sample,
  Recorder, SampleGen) or per grain (Granular). `Engine::playheads`; WASM `bd_pack_playheads`; plugin snapshot
  `playheads`. Tests: engine "Playheads…"; ui `waveform-playheads`.

### Owner review 2 (2026-11-08, Ableton)
- **BlokDust FX lowered the track's level:** Audio Input was summed to mono, then went through v1's master
  compressor and −12 dB master volume. Now a true bypass, stereo (PLUGIN-0002). golden-update: fx-audio-in, fx-demo.
  Tests: engine "Audio In alone is a true bypass…", "Plugins: Microphone (labelled Audio Input)…".
- **Gain on Audio Input / Microphone:** one Gain row (dB). Tests: engine "Microphone gain…"; ui `input-gain-option`.
- **Connection lines gone in an FX instance:** once blocks were deleted, the engine's ids were no longer 1..N, but a
  reopened or reloaded editor numbered the patch 1..N. Connections then named the wrong blocks (and moves and params
  went to the wrong ones). The editor now sends the engine's ids with the patch; new blocks send their patch id.
  Test: ui `plugin-reopen-keeps-ids`.
- **Stuck key after clicking into Ableton:** the web view saw neither the key-up nor a blur. The editor watches its
  window's key status and, on losing it, tells the page (`bd_keysLost`) and releases the page's held keys; closing
  the editor releases them too. Test: ui `plugin-keys-lost`. Manual check in Ableton.
- **Play resyncs the world** (SIMULATION-0003): takes from bar 1 match. Tests: engine "the DAW transport starting
  resyncs the world…"; `bd plugin test` "Play resyncs: takes from bar 1 match".
- **New (owner): keyboards power Emitters and Lasers** (SPEC-CONNECTIONS-PROXIMITY R2): a held key powers them, the
  note aims them (12 notes = 12 clock positions, C at 12 o'clock). Tests: engine "Keyboards power connected Emitters
  and Lasers…", "R2 S3…"; ui `keyboard-powers-emitter`.

### Owner review 3 (2026-11-08, Ableton)
- **MPE much quieter than plain MIDI:** MPE notes started at 0.3 + 0.5 × velocity (0.8 at most) and plain MIDI ignored
  velocity. Both now start at 0.2 + 0.8 × velocity²; pressure swells MPE notes to full (PLUGIN-0004).
  golden-update: midi-notes, mpe, mpe-midi. Test: engine "MIDI Input velocity sets the note's level…".
- **Mono glide snapping:** v1 glides only between overlapping keys, and releases the voice when its key goes up even
  with another held. Mono now returns to the newest key still held (gliding), and a key pressed within 250 ms of the
  last one's release glides from it with a fresh envelope. golden-update: keys. Tests: engine "Mono glide: …" (2),
  "controller transpose … returns to a key still held".
