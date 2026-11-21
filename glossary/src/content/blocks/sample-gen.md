---
title: "SampleGen"
description: "SampleGen is a sample-player which procedurally generates a new audio sample, for creating unique textures or arpeggiated loops."
legacySource: "https://www.blokdust.com/guide-sub/samplegen.html"
blockId: "source.sample-gen"
category: "source"
---

SampleGen is a [Source](/blocks/categories/source/) block. It’s a sample player, operating in the same way as the [Sample](/blocks/sample/) block, but instead of loading in an existing audio sample, it employs the concept of [Procedural Generation](https://en.wikipedia.org/wiki/Procedural_generation) to create a new one on the fly.

This process uses [Algorithms](https://en.wikipedia.org/wiki/Algorithm) and random number generations to plot out a number of simple waveforms, and then combines those waveforms to create a single more complex waveform. (A good video demonstration on combined waveforms [can be found here](https://www.youtube.com/watch?v=uJDDI9beju4)).

In its options, ‘Wave’ gives you a graphic of the generated waveform, and lets you drag locators for the Start, End and Loop Start & Loop End. The ‘Generate Wave’ button will run the procedural generation and create a new sample. The ‘Reverse’ switch will switch the direction the sample plays, and ‘Loop’ will toggle between whether the sample just plays through once, or continues looping between the Loop Start & Loop End locators. ‘Playback’ sets the speed/pitch of the sample.

Each of the simple waveforms it generates can be thought of as an individual voice or instrument. The SampleGen algorithms follow a path of decision-making where these voices choose options such as; a waveform shape, a pitch, whether they will [arpeggiate](https://en.wikipedia.org/wiki/Arpeggio), and if so how quickly does it arpeggiate, and with what kind of melodic pattern. Some voices will choose to follow their own path while others choose to act as a harmonic to another leading voice. As all of these various options combine, the resultant scope for sample variation becomes massive.

Digital audio can usually be described as simply a list of numbers, these numbers represent a waveform’s amplitude at a given time. Each of these numbers may be referred to as a sample, and sample rate determines how many of these samples happen per second.

Try generating a wave, then turn on ‘Loop’ and shorten the space between its loop markers to find a little repeating sound.

## Further reading

- <https://en.wikipedia.org/wiki/Digital_audio>
- <https://en.wikipedia.org/wiki/Procedural_generation>
- <https://en.wikipedia.org/wiki/Waveform>
- <https://en.wikipedia.org/wiki/Arpeggio>
