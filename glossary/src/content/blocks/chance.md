---
title: "Chance"
description: "Switches connected blocks on or off at random when hit by a particle or laser beam."
blockId: "power.chance"
category: "power"
image:
  theme: sea-cucumber
  src: "/guide-media/chance.jpg"
  alt: "Chance options above a circuit with a Particle Emitter and a Tone."
  width: 820
  height: 460
---

Chance is a [Power](/blocks/categories/power/) block. Each time it’s hit, it makes a fresh choice. If the hit passes, Chance powers the blocks connected to it. Otherwise, it switches them off. It stays in that state until the next hit.

In the options, ‘Chance’ sets the likelihood of switching on. At 0% it will always switch off, at 100% it will always switch on, and at 50% it could go either way each time.

Aim a [Particle Emitter](/blocks/particle-emitter/) at a Chance block with a [Tone](/blocks/tone/) beside it. Set the chance low and let the particles pick out gaps in the sound.
