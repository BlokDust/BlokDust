---
title: "Audio In"
description: "Brings the audio from a DAW track into BlokDust FX, where it can run through effects."
blockId: "source.audio-in"
category: "source"
image:
  theme: mode-stereo
  src: "/guide-media/audio-in.jpg"
  alt: "The Audio Input panel shows the Gain control, with a Filter beside the input on the stage."
  width: 750
  height: 210
---

Audio In is a [Source](/blocks/categories/source/) block. It is already there when you start a fresh patch in BlokDust FX. Move an [Effect](/blocks/categories/effect/) nearby and the sound coming into the plug-in will run through it. Audio In stays on and needs no power block.

In its options, ‘Gain’ sets the input level. At 0 dB and with no effects attached, the plug-in passes the incoming stereo signal through unchanged. The desktop plug-ins also show the [Microphone](/blocks/microphone/) block as ‘Audio Input’.

Try putting BlokDust FX on a drum track and connecting a [Stereo Delay](/blocks/stereo-delay/) to the input. Turn on ‘Tempo Sync’ in the delay to set the echoes in time with the track. On the web, a patch’s Audio In opens as a [Microphone](/blocks/microphone/) and needs power. Use Microphone from the Source menu to put live audio into a web patch.
