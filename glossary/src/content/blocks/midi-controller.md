---
title: "MIDI Controller"
description: "Allows you to control any connected Source blocks using a hardware MIDI device connected via USB."
legacySource: "https://www.blokdust.com/guide-sub/midi-controller.html"
blockId: "input.midi-controller"
category: "interaction"
---

MIDI Controller is an [Interaction](/blocks/categories/interaction/) block. It allows you to create playable [synths](/guide/synths/) by letting you trigger any connected [Source](/blocks/categories/source/) blocks using a connected hardware [MIDI device](https://en.wikipedia.org/wiki/MIDI_controller). Hardware MIDI devices commonly take the form of a keyboard, or a set of trigger pads, and will connect via USB. They control music hardware or software via digital messages.

BlokDust will automatically detect connected USB devices and allow you to use them to trigger Source blocks, using either [monophonic](https://en.wikipedia.org/wiki/Monophony) or [polyphonic](https://en.wikipedia.org/wiki/Polyphony) voices.

On the web, use a browser with Web MIDI support, such as Chrome, and allow MIDI access when asked. In a plug-in, look for ‘MIDI Input’. It receives the MIDI sent by the host.

In its options, choose the device and channel, then switch between monophonic and polyphonic voices. ‘Octave’ transposes the connected sources and ‘Glide’ sets the transition time between notes in mono mode. If your controller sends MPE, turn on ‘MPE’ for per-note expression. ‘Silent Keys’ lets you choose notes with keys and trigger them separately with power.

## Further reading

- <https://en.wikipedia.org/wiki/MIDI_controller>
- <https://www.w3.org/TR/webmidi/>
- <https://en.wikipedia.org/wiki/Synthesizer>
- <https://en.wikipedia.org/wiki/Glissando>
- <https://en.wikipedia.org/wiki/Octave>
- <https://en.wikipedia.org/wiki/Transposition_(music)>
- <https://en.wikipedia.org/wiki/MIDI>
