---
title: "Void"
description: "Void is a hole in space which absorbs any particles or laser beams that collide with it, making it useful for shielding certain blocks from being powered."
legacySource: "https://www.blokdust.com/guide-sub/void.html"
blockId: "power.void"
category: "power"
---

Void is a [Power](/blocks/categories/power/) category block. It needs no connections. It exists (or doesn’t exist?) as a hole in space, which absorbs any particles fired from a [Particle Emitter](/blocks/particle-emitter/), or any laser beams fired from a [Laser](/blocks/laser/) which come into contact with it.

It’s used as shielding, if you have a scene with particles or laser beams but there are certain blocks you don’t want to be triggered by them, you can block the path with one or several Void blocks.

One simple example is if you have a Laser block, set to ‘Rotate’, and the Laser is being powered by a [Toggle Power](/blocks/toggle-power/) block. Ordinarily, when the rotating laser beam gets to a point where it hits the Toggle Power, the toggle would be switched, and the Laser would be unpowered. This might sometimes be useful, but often you don’t want a Laser to turn itself off, so you can build a wall of Void blocks between the Laser and the Toggle Power, stopping the beam from hitting the Toggle Power block.

The Void block has no options panel.

Blocks in the Power category can be combined to create interesting reactions, and self-playing environments. Read more on this subject on the [Power page](/blocks/categories/power/).

## Further reading

- <https://en.wikipedia.org/wiki/Circuit_breaker>
