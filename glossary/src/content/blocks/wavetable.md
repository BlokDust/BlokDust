---
title: "Wavetable"
description: "An oscillator that moves between different wave shapes to change the sound as a note plays."
blockId: "source.wavetable"
category: "source"
image:
  theme: ikko
  src: "/guide-media/wavetable.jpg"
  alt: "The Wavetable panel shows its waveform, selected table and position."
  width: 820
  height: 460
---

Wavetable is a [Source](/blocks/categories/source/) block. Like [Tone](/blocks/tone/), it plays an oscillating waveform. A wavetable contains a series of these shapes, so moving through the table can change the character of the sound while its pitch stays the same.

In the options, ‘Table’ chooses a set of shapes, and ‘Position’ moves through them. The ‘Wave’ display shows the current shape. ‘Note’ sets the pitch and ‘Fine’ lets you tune it a little sharp or flat.

Try the ‘Bell’ table. Start on one end of ‘Position’ and sweep to the other while you hold a note. Connect an [LFO](/blocks/lfo/) and choose Wavetable’s position to make the shape change by itself.
