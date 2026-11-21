---
title: "Power"
description: "A Power block is used to trigger and sustain a Source block, useful for creating drones or loops. It’s also used to Power Lasers and Particle Emitters."
legacySource: "https://www.blokdust.com/guide-sub/power-block.html"
blockId: "power.power"
category: "power"
---

Power is a [Power category](/blocks/categories/power/) block. Connecting it to a [Source](/blocks/categories/source/) block will power that source block, triggering its audio, and keeping it on until disconnected. This makes it useful if you want to create a [synth](/guide/synths/) drone, or if you have a sample (with a [Sample](/blocks/sample/), [SampleGen](/blocks/sample-gen/) or [Recorder](/blocks/recorder/) block) that you want to loop continuously, without using an [interaction](/blocks/categories/interaction/) block to do it manually.

Power blocks can also power [Particle Emitters](/blocks/particle-emitter/) and [Lasers](/blocks/laser/), both of which can run without a separate power block if their own on/off switch is on. Blocks in the Power category can be combined to create interesting reactions, and self-playing environments. Read more on this subject on the [Power page](/blocks/categories/power/).

In its options, turn on ‘Hits Cut Power’. A particle cuts the power briefly, and a laser beam cuts it for as long as it touches the block. A held sound can play again when the power returns.

## Further reading

- <https://en.wikipedia.org/wiki/Drone_(music)>
- <https://en.wikipedia.org/wiki/Loop_(music)>
