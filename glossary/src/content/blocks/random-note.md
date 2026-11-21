---
title: "Random Note"
description: "Picks a note at random each time a connected source is triggered."
blockId: "fx.random-note"
category: "effect"
image:
  theme: ash-peak
  src: "/guide-media/random-note.jpg"
  alt: "Random Note options showing the note weights and a two-octave range."
  width: 820
  height: 460
---

Random Note is a [note effect](/blocks/categories/effect/). A key or a hit gives the block a reason to choose a note. This lets you turn a steady stream of particles into a melody with different pitches.

In the options, the 12 bars in ‘Notes’ set how likely each note is to be picked. Higher bars come up more often. A bar at zero leaves that note out. ‘Key’ shifts the pattern round the 12 notes, and ‘Range’ sets the lowest and highest pitches that can be chosen.

Aim a [Particle Emitter](/blocks/particle-emitter/) at a [Tone](/blocks/tone/) and connect Random Note to the Tone. Leave three bars up, set a range of a couple of octaves, and hear those notes turn up high and low.
