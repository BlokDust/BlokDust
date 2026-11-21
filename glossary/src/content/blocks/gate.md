---
title: "Gate"
description: "A switchable barrier that can let particles and laser beams through, or stop them."
blockId: "power.gate"
category: "power"
image:
  theme: volcanologist
  src: "/guide-media/gate.jpg"
  alt: "A Gate sits between a Laser and a Tone, with a Counter circuit nearby."
  width: 720
  height: 410
---

Gate is a [Power](/blocks/categories/power/) block. When closed it works like a [Void](/blocks/void/), absorbing particles and stopping laser beams. Power it from a nearby [Power](/blocks/power/), [Toggle Power](/blocks/toggle-power/) or another logic block to open the path.

In the options, ‘Invert’ swaps the two states. With Invert on, the gate is open until power closes it. A particle or beam travelling through the gate leaves its state alone.

Try putting a Gate between a [Laser](/blocks/laser/) and a [Tone](/blocks/tone/). Connect a Toggle Power to the Gate and use it to switch the Tone in and out.
