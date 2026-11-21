---
title: "Power blocks"
heading: "Power"
description: "Blocks in the Power category are used to power Source blocks, build autonomous mechanisms or set up chain reactions and/or sequences."
legacySource: "https://www.blokdust.com/guide-sub/power.html"
route: "blocks/categories/power"
---

The concept of power in [BlokDust](/about/) allows for more inventive creations, particularly in the area of self-playing environments. At it’s simplest, a standard [Power](/blocks/power/) block can be used to continuously power a [Source](/blocks/categories/source/) block (or any number of Source blocks connected to it).

While the Power block, [Toggle Power](/blocks/toggle-power/) and [Pulse Power](/blocks/pulse-power/) will directly power Source blocks connected to them, the [Particle Emitter](/blocks/particle-emitter/) and [Laser](/blocks/laser/) blocks transfer power over distance. They can be powered by a nearby block or run using their own on/off switches.

One very basic example of an autonomous mechanism, is to connect a Power block to a Particle Emitter which is aimed at a [Tone](/blocks/tone/) block (or any other type of Source block).

The most simple sequence can be achieved by connecting a Power block to a Laser, setting the Laser’s ‘rotate’ option, and placing several Source blocks within range of the Laser’s beam. As the laser beam rotates it will play a repeating pattern.

Combining these mechanics, firing particles at Laser blocks, laser beams at Particle Emitters, or firing either at Toggle/Pulse blocks, starts to open up potential for new combinations and chain reactions.

BlokDust’s power concept was in part inspired by the ‘Redstone’ circuits in Minecraft. Try a [Counter](/blocks/counter/) to make a repeating pattern, a [Prism](/blocks/prism/) to split a path, or a [Gate](/blocks/gate/) to open and close one. Turn on Tempo Sync on a Laser or an Emitter to keep the circuit in time.

## Further reading

- <https://en.wikipedia.org/wiki/Logic_gate>
- <https://en.wikipedia.org/wiki/Synthesizer>
