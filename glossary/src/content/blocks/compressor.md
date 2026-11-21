---
title: "Compressor"
description: "Brings down louder parts of a sound so its overall level is more even."
blockId: "fx.compressor"
category: "effect"
image:
  theme: mode-stereo
  src: "/guide-media/compressor.jpg"
  alt: "Compressor options with an input Level meter, threshold line and gain reduction."
  width: 820
  height: 460
---

Compressor is a [post-effect](/blocks/categories/effect/). It listens to the audio from a connected [Source](/blocks/categories/source/) and turns it down when it goes above a chosen level. This can make a sound sit more evenly, or make the difference between the sharp beginning of a note and its tail less pronounced.

In the options, drag the line on the ‘Level’ meter to set the threshold. ‘Ratio’ sets how much the sound is turned down above that line. ‘Knee’ softens the change around it, ‘Attack’ and ‘Release’ set how quickly the compression starts and lets go, and ‘Makeup’ brings the level back up afterwards.

Try it on a [Sample](/blocks/sample/) with a few loud hits. Bring the threshold down until the meter shows some gain reduction, then change the attack to hear how much of each hit gets through.
