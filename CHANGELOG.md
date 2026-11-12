# What's new in BlokDust 2

BlokDust 2 keeps the original's blocks, look and feel, and rebuilds everything underneath. Here is what it can do that
BlokDust 1 couldn't.

## In your music software
- **VST3 and Audio Unit plug-ins** for macOS and Windows, free: use BlokDust inside Ableton Live, Logic, REAPER,
  Bitwig, Cubase or FL Studio.
- **Two plug-ins:** *BlokDust*, an instrument played from your MIDI track, and *BlokDust FX*, an effect that runs your
  track's audio through its blocks (it starts with an Audio In block).
- **A standalone app** for macOS and Windows.
- **Follows your DAW's tempo:** Emitters, Pulses and Lasers can sync to the beat in musical divisions, and start and
  stop with the transport.
- **Automation:** eight Dust controls you can assign to any block's slider (right-click it), then automate or map to
  a MIDI controller.
- **Your project remembers the patch**, samples included, and finds a moved sample file again.
- **Drag audio in** from Finder, Explorer or your DAW, onto a sampler or onto the stage to make a new Sample block.

## Playing
- **MPE:** per-note pitch bend, pressure and slide from MPE controllers (ROLI, Linnstrument, Funputs and others).
- **MIDI Input** picks a device (Web MIDI) and a channel.
- **Every key press fires a particle**, including legato playing and chords on a polyphonic keyboard.
- **A power switch** (or Space) stops and starts everything at once.
- **A tempo setting** for the whole patch on the web.

## Making patches
- **Patch files:** save, open and insert `.blokdust` files. Insert adds a patch to what you already have.
- **Presets** to start from: keyboard synths, a microphone reverb recorder, a laser sequence and a step sequencer.
- **Multi-select:** Shift or Cmd-click, or drag a box, then move, duplicate or delete blocks together.
- **Undo** for deleted blocks.
- **More from the Filter:** Low pass, High pass and Band pass as well as v1's Peak, shaped on a graph like the EQ's.
- **Freesound** sample search (v1's SoundCloud search no longer works), or use your own audio files. Audio never
  leaves your computer.

## Touch, trackpad and mouse
- **Pinch to zoom** on touch screens and trackpads, and **zoom with the mouse wheel**, smoothly, around the pointer.
- **Multi-touch:** each finger can drag its own block or move its own slider.
- **Works on phones and iPads**, including sound with the iPhone's silent switch on.

## Sharing
- **Share links** with a title and a preview image for social media and chat apps.
- **Embeds:** put a playable patch on your own site (oEmbed supported).
- **Save and Save As**, as in v1, without an account.

## Under the hood
- **A new audio engine** in C++, compiled to WebAssembly for the browser and native in the plug-ins: the same sound
  everywhere, and much faster than v1.
- **Smooth reconnections:** moving blocks crossfades the sound instead of muting it.
- **Deterministic:** the same patch plays the same way every time, which keeps every block tested against the
  original's sound and pixels.
