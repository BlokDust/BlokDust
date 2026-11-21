---
title: "Stage"
description: "Holds a group of blocks in its own little world, which you can play as a single sound source."
blockId: "source.stage"
category: "source"
image:
  theme: sea-cucumber
  src: "/guide-media/stage.jpg"
  alt: "The Stage options show Volume, Keep Particles, Open Stage and Load Patch."
  width: 820
  height: 460
---

Stage is a [Source](/blocks/categories/source/) block. The blocks inside have their own connections, particles and beams. Power the Stage from outside and the world inside starts running. Its sound comes out of the Stage, where you can treat it like any other source and add effects.

Use ‘Open Stage’ to see and edit what’s inside. You can also make a Stage from a selection of blocks. ‘Volume’ sets the level of the whole inner patch, and ‘Keep Particles’ lets particles already in flight continue when the outside power is cut.

Try putting a small self-playing scene inside a Stage, then use [Toggle Power](/blocks/toggle-power/) to start and stop it. To play notes from outside, put a [Stage In](/blocks/stage-in/) beside a source inside the Stage.
