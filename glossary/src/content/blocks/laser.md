---
title: "Laser"
description: "Fires a laser beam which will power Source blocks while it passes through them, triggering sounds. The beam will also switch Toggle Power blocks, and power other Laser blocks."
legacySource: "https://www.blokdust.com/guide-sub/laser.html"
blockId: "power.laser"
category: "power"
---

Laser is a [Power](/blocks/categories/power/) category block. When powered (via a [Power](/blocks/power/) block, [Toggle Power](/blocks/toggle-power/), [Particle](/blocks/particle-emitter/) or another [Laser](/blocks/laser/) beam), The Laser will fire an instant laser beam across the screen. When this beam passes through a [Source](/blocks/categories/source/) block, the Source block becomes powered, triggering its sound.

A laser beam passing though a Toggle Power block will switch the Toggle Power between on & off. A beam passing through a [Pulse Power](/blocks/pulse-power/) block will cause the Pulse to relay a burst of its power to any connections it has. A beam passing through another Laser block will again power that block, causing it to in-turn fire its own laser beam. Laser beams pass through Effect blocks with no results. Laser beams cannot pass through a [Void](/blocks/void/) block, the beam is cut short.

In the Laser’s options, ‘Angle’ sets the direction of the beam and ‘Range’ sets its length. ‘Rotate’ turns it clockwise or anticlockwise. Turn on ‘Tempo Sync’ to set a full ‘Turn’ in beats or bars. ‘Restart’ makes the beam start from its set angle each time it starts turning.

Use the Laser’s on/off switch to keep it firing without a separate power block. A closed [Gate](/blocks/gate/) can stop the beam, or you can run it into a [Prism](/blocks/prism/) to split it into several beams.
