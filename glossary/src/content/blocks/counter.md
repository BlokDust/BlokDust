---
title: "Counter"
description: "Counts incoming hits and powers connected blocks on the active steps of a repeating pattern."
blockId: "power.counter"
category: "power"
image:
  theme: fjord
  src: "/guide-media/counter.jpg"
  alt: "The Counter options show eight steps with three active hits."
  width: 820
  height: 460
---

Counter is a [Power](/blocks/categories/power/) block. Each particle or laser hit moves it on by one step. If that step is on, Counter powers the blocks connected to it. An empty step turns the power off again.

In the options, ‘Steps’ sets the length of the pattern, ‘Hits’ sets how many steps are on, and ‘Rotate’ moves the pattern round. The active steps are spread as evenly as possible. You can also click steps in ‘Pattern’ to set them by hand. ‘Reset’ starts the count again.

Try eight steps and three hits. Aim a tempo-synced [Particle Emitter](/blocks/particle-emitter/) at the Counter, and put a [Tone](/blocks/tone/) or [Sample](/blocks/sample/) beside it to hear the pattern.
