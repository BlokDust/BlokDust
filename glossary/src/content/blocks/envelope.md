---
title: "Envelope"
description: "An Envelope shapes the loudness of a sound over time, i.e how quickly a note fades in, or how long it takes to fade out after release."
legacySource: "https://www.blokdust.com/guide-sub/envelope.html"
blockId: "fx.envelope"
category: "effect"
---

In BlokDust, Envelope is a [pre-effect](/blocks/categories/effect/). It shapes the sound of a [Source](/blocks/categories/source/) block by setting the Attack Time, Decay Time, Sustain Level, and Release Time (ADSR).

Attack Time affects how much time it takes for a sound to transition from silence to full volume (peak). Decay Time sets how long it takes to transition from peak to the sustain level. Sustain Level is the volume the sound then remains at until it’s released. Release Time is the time it takes for the sound to transition back to silence after it’s been released.

The options show the envelope as a curve with draggable markers. Move the first marker to set Attack, the middle marker to set Decay and Sustain, and the last marker to set Release. To hear the shape, play a note on a controller or trigger the source with a particle.

## Further reading

- <https://en.wikipedia.org/wiki/Synthesizer#Attack_Decay_Sustain_Release_.28ADSR.29_envelope>
