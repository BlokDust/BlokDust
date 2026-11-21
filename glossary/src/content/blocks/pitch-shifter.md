---
title: "Pitch Shifter"
description: "The Pitch shifter takes an audio signal and raises or lowers its pitch by a given amount, while leaving the timing of the original audio intact."
legacySource: "https://www.blokdust.com/guide-sub/pitch-shifter.html"
blockId: "fx.pitch-shifter"
category: "effect"
---

Pitch Shifter is a [post-effect](/blocks/categories/effect/). It adjusts the pitch of incoming audio by a given amount, without altering the speed of the original audio. This is achieved by continuously adjusting the delay time of a [delay](https://en.wikipedia.org/wiki/Delay_(audio_effect)) effect, either up or down. The continuously changing delay time creates a consistent “[Doppler effect](https://en.wikipedia.org/wiki/Doppler_effect)” which transposes the pitch.

In its options, ‘Pitchshift’ sets the amount of transposition between -1 & +1 octaves. ‘Mix’ blends the shifted audio with the original audio, allowing for a harmonizer effect.

## Further reading

- <http://msp.ucsd.edu/techniques/v0.11/book-html/node115.html>
- <https://en.wikipedia.org/wiki/Pitch_shift>
- <https://en.wikipedia.org/wiki/Audio_time-scale/pitch_modification>
- <https://en.wikipedia.org/wiki/Doppler_effect>
- <https://en.wikipedia.org/wiki/Delay_(audio_effect)>
