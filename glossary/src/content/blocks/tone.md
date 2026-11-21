---
title: "Tone"
description: "Generates a musical tone. The Tone block is an oscillator which creates a waveform used as the basis of most synths."
legacySource: "https://www.blokdust.com/guide-sub/tone.html"
blockId: "source.tone"
category: "source"
---

Tone is a [Source](/blocks/categories/source/) block. It’s one of the most commonly used blocks in [BlokDust](/about/), and is one of the simplest starting points for creating [synths](/guide/synths/). It creates a continuous sound by producing an [oscillating](https://en.wikipedia.org/wiki/Electronic_oscillator) signal, resulting in a waveform. The frequency of this oscillation/wave determines the pitch you hear.

Like other Source blocks it can be triggered using a controller from the [Interaction](/blocks/categories/interaction/) category to make playable keyboards, or triggered via [Power](/blocks/categories/power/), and connected to [Effects](/blocks/categories/effect/) to create a huge range of sounds.

In Tone’s options, ‘Note’ sets the base pitch of the tone. The display shows the pitch in [Scientific Pitch Notation](https://en.wikipedia.org/wiki/Scientific_pitch_notation), that is the note name, followed by the octave. “C4” is middle-C. If controlling the Tone via a controller, the Note setting can be treated as a Transpose. ‘Fine’ sets the fine tuning, it alters the pitch [microtonally](https://en.wikipedia.org/wiki/Microtonal_music) between -1 & +1 semitones.

The ‘Wave’ option sets the [waveform](https://en.wikipedia.org/wiki/Waveform) of the oscillator. Sine creates the least aggressive sound, sounding smooth/ pure with no harmonics. Square creates a more aggressive tone, sounding more intense and present. Triangle sounds softer than a square wave, but has more harmonic content than the Sine. Sawtooth sounds the most aggressive, with more harmonics and a buzz-like quality.

## Further reading

- <https://en.wikipedia.org/wiki/Electronic_oscillator>
- <https://en.wikipedia.org/wiki/Sine_wave>
- <https://en.wikipedia.org/wiki/Signal_processing>
- <https://en.wikipedia.org/wiki/Subtractive_synthesis>
- <https://en.wikipedia.org/wiki/Synthesizer>
