---
title: "Particle Emitter"
description: "Fires a stream of particles which will momentarily power Source blocks when they collide with them, triggering sounds. The particles will also switch Toggle Power blocks, and power Laser blocks."
legacySource: "https://www.blokdust.com/guide-sub/particle-emitter.html"
blockId: "power.emitter"
category: "power"
---

Particle Emitter is a [Power](/blocks/categories/power/) category block. When powered (via a [Power](/blocks/power/) block, [Toggle Power](/blocks/toggle-power/), or [Laser](/blocks/laser/) beam), The Particle Emitter will start emitting a stream of particles which travel across the screen. When these particles collide with a [Source](/blocks/categories/source/) block, the Source block becomes momentarily powered, triggering its sound, and the particle is destroyed.

A particle colliding with a Toggle Power block will switch the Toggle Power between on & off. A particle colliding with a [Pulse Power](/blocks/pulse-power/) block will briefly power that block, which will relay that power to any connections it has. A particle colliding with a Laser block will again briefly power that block, causing it to fire it’s laser beam for a moment. Particles pass over Effect blocks, and are destroyed if they collide with a [Void](/blocks/void/) block.

In the Particle Emitter’s options, ‘Angle’ sets the direction which the particles fire in. ‘Fire Rate’ sets the interval between particles. ‘P.Speed’ sets the speed that the particles themselves travel, and ‘Range’ sets the distance that the particles travel before they self-destruct.

The emitter can run from its own on/off switch, and a particle hitting another emitter makes that emitter fire once. Turn on ‘Tempo Sync’ to set the spacing with ‘Division’. ‘Swing’ shifts alternate hits, and ‘Offset’ nudges the timing by a fraction of the interval.
