---
title: "AutoWah"
description: "AutoWah is an Effect block which creates a filter sweep in response to the volume of audio coming from any Source blocks it’s connected to."
legacySource: "https://www.blokdust.com/guide-sub/autowah.html"
blockId: "fx.auto-wah"
category: "effect"
---

AutoWah is a [post-effect](/blocks/categories/effect/). It processes the audio signal coming from any [Source](/blocks/categories/source/) blocks connected to it by applying a ‘low-pass’ filter. The frequency of the filter is set in response to the volume of the audio signal. As this frequency sweeps up and down it creates the “wah” sound associated with a wah-wah pedal.

In the AutoWah’s options, ‘Frequency’ is the lowest starting point for the filter sweep, ‘Range’ determines how wide the sweep is, and ‘Attack’ & ‘Release’ determine how sensitively the filter follows the incoming audio signal.

Outside of BlokDust, an AutoWah may also be known as an envelope filter or envelope follower, among other names.

## Further reading

- <https://en.wikipedia.org/wiki/Auto-wah>
- <https://github.com/Theodeus/tuna>
- <https://en.wikipedia.org/wiki/Audio_signal_processing>
- <https://webaudio.github.io/web-audio-api/>
