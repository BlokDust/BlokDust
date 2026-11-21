---
title: "Interaction blocks"
heading: "Interaction"
description: "Interaction blocks connect to Source blocks and act as a means of controlling them as a playable instrument."
legacySource: "https://www.blokdust.com/guide-sub/interaction-2.html"
route: "blocks/categories/interaction"
---

Connecting an Interaction block to a [Source](/blocks/categories/source/) block allows you to play that Source block, typically controlling pitch (frequency in Tone blocks, and playback rate in sample-based blocks).

The [Computer Keyboard](/blocks/computer-keyboard/) block lets you use your computer’s QWERTY keyboard as a music keyboard.

BlokDust supports MIDI with the [MIDI Controller](/blocks/midi-controller/) block, allowing you to use an external keyboard or other style controllers which are attached via USB. On the web this uses the Web MIDI API.

Use a [Touchpad](/blocks/touchpad/) for an on-screen instrument. Inside a [Stage](/blocks/stage/), use [Stage In](/blocks/stage-in/) to play inner sources from a controller outside. Add a Label from the Interaction menu to leave a note on the stage.

## Further reading

- <https://webaudio.github.io/web-audio-api/>
- <https://en.wikipedia.org/wiki/Synthesizer>
- <https://en.wikipedia.org/wiki/MIDI>
- <http://www.keithmcmillen.com/blog/making-music-in-the-browser-web-midi-api/>
