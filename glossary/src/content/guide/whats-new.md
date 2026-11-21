---
title: "What’s New in BlokDust 2"
tileTitle: BlokDust 2 is Live!
description: "The second release brings new blocks, tempo-synced circuits, plug-ins for your DAW and a gallery where you can share and remix patches."
artwork: blokdust-is-live.html
route: guide/whats-new
---

## Audio plug-ins

You can run BlokDust as a software instrument or open BlokDust FX to put effects on a track. The [Audio In](/blocks/audio-in/) block carries the track’s sound into the patch. In the instrument plug-in it can receive audio from your DAW’s side-chain, too.

The [desktop downloads](/downloads/) include a standalone app and VST3 plug-ins for macOS and Windows, plus Audio Unit plug-ins on macOS. Use VST3 in hosts such as Ableton Live, REAPER, Bitwig, Cubase and FL Studio, or use Audio Unit in Logic.

Tempo-synced [Particle Emitters](/blocks/particle-emitter/), [Pulse Power](/blocks/pulse-power/), [Lasers](/blocks/laser/) and [Stereo Delay](/blocks/stereo-delay/) follow your DAW’s tempo and transport. Right-click a slider to assign it to one of eight Dust controls, then automate it in the DAW or map it to a MIDI knob. Your DAW project keeps its patches and samples, and you can save patches to files. Drag audio from Finder, Explorer or your DAW onto the stage to create a [Sample](/blocks/sample/) block.

## Playing

The [MIDI Controller](/blocks/midi-controller/) block supports per-note pitch bend, pressure and slide from MPE controllers. Choose a MIDI channel in the plug-in, or choose a MIDI device on the web.

A keyboard block can trigger an emitter or laser. A key fires the emitter at its set angle and holding the key keeps the emitter firing at its own rate. A laser stays on until you let go of the last key. Use the global power switch or Space to stop and start the scene. On the web, set the tempo for the whole patch in Settings.

## Making patches

Save, open or insert `.blokdust` files. Insert adds a patch’s blocks to the scene you already have open. Try a built-in preset to get started, such as a keyboard synth, a microphone and reverb recorder, a rotating laser sequence, a step sequencer or a self-playing chord scene.

Shift-drag or Shift-click to select several blocks, or press, hold and drag on mobile. You can move them together, duplicate them with Option or Alt, or delete them with Backspace, Delete or the trash. Use Cmd/Ctrl+Z to undo adding, duplicating, moving or deleting blocks and Cmd/Ctrl+Shift+Z to redo it.

The [Filter](/blocks/filter/) now has low-pass, high-pass, band-pass and peak types, with a graph like the EQ’s. Effects are applied in the order you connect them to a source, and the patch remembers that order.

[Sample](/blocks/sample/), [Granular](/blocks/granular/) and [Convolution](/blocks/convolution/) can search [Freesound](https://freesound.org/) for Creative Commons sounds and show who made them. You can also use your own audio files. Those files stay on your device. If you share a patch that uses a local file, the other person will need their own copy of the audio.

Try a [Wavetable](/blocks/wavetable/) oscillator, split a beam with a [Prism](/blocks/prism/), or put a group of blocks inside a [Stage](/blocks/stage/). You’ll find them alongside the other [blocks](/blocks/).

## Touch, trackpad and mouse

Zoom with the mouse wheel or pinch on a touchscreen or trackpad. On phones and tablets you can move several blocks or sliders at once, one with each finger.

## Sharing

A share link carries a title and preview image into chat and social apps. You can also embed a playable patch on your own site. Save and Save As work without an account.

Open Gallery from the Patches menu to browse work by other people. Search for a patch name, block or @person, like a patch, open it to see how it works, or make a remix. Sign in to publish your own patches to the gallery and keep them together across devices. You can sign in with a passkey, Google or Apple.

## Under the hood

The audio engine was rebuilt in C++. It runs as WebAssembly in the browser and natively in the plug-ins, so the same patch runs on the same engine. Moving effects in and out of a chain crossfades the sound to avoid clicks, and the same patch plays the same way each time.

In the project’s benchmark, a scene with 100 blocks firing particles used 10% of one CPU core on the main thread, compared with 47% in V1. A separate 300-block scene ran at 60 fps while using under 4% of one core on the main thread.

[Open BlokDust](/) to try it, or follow the illustrated [Get Started guide](/guide/get-started/).
