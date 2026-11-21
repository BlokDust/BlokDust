---
title: "Sound Laser"
description: "Listens to a nearby sound source and fires a beam when the sound gets loud enough."
blockId: "power.sound-laser"
category: "power"
image:
  theme: mode-stereo
  src: "/guide-media/sound-laser.jpg"
  alt: "A Sound Laser listens to one Tone and aims its beam at another."
  width: 720
  height: 410
---

Sound Laser is a [Power](/blocks/categories/power/) block. It listens to the audio from connected [Source](/blocks/categories/source/) blocks after their effects. When the sound reaches the threshold, it fires a beam which can trigger blocks just like a [Laser](/blocks/laser/).

In the options, drag the line on the ‘Level’ meter to set the threshold. ‘Band’ chooses which part of the sound it listens to, and ‘Beam on’ lets you fire when the sound is louder or quieter than the line. ‘Hold’ keeps the beam on a little longer. ‘Angle’ and ‘Range’ set where it goes.

Try listening to the lows of a drum [Sample](/blocks/sample/). Aim the beam at a [Tone](/blocks/tone/) and lower the line until the louder hits make the Tone answer.
