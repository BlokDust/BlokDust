---
id: UI-0008
title: A power switch for the whole world, on the stage
status: accepted
date: 2026-11-11
domain: ui
tags: [power, release-1]
supersedes: []
superseded_by:
---
# UI-0008: A power switch for the whole world, on the stage

## Context
Owner (2026-11-11): a patch like the spinning laser plays on by itself; while looking around the site the player
wants to stop the sound without taking the patch apart, and then start it again. The worry: switched off and forgotten,
BlokDust looks broken. v1 has no such control.

## Decision
We will add one switch, drawn at the bottom centre of the stage (between the zoom buttons and the trash) with v1's
off/on switch (OptionSwitch "offOn": a dash and a diamond, the lit side underlined) at v1's own proportions (a 60u
options row; owner, 2026-11-11: the first, squashed version put the underline too close). The dash and diamond sit level
with + − and the trash (30u up). Above it, where v1's zoom shows its percentage (50u up): POWER, or, when off, POWER OFF
on v1's red fill (below would meet the screen edge). Space toggles it on the web (in a DAW, Space belongs to the transport).
Off (`Command::WorldPower`): Power and Toggle blocks power nothing, emitters don't emit, lasers go out, and particles
in flight vanish. What the player does still sounds: a held block, the computer keyboard, MIDI. It is not saved with
the patch, so a reload starts powered; a reopened plugin editor turns it back on to match its switch.

## Consequences
- The switch is always on screen, so a stopped world always says why, and the same control starts it again.
- It sits under the full-screen panels (drawn before them) and takes clicks only when they are closed.
- Tests: engine "World power off" (tone, emitter, particles, held block, laser), ui-regressions `power-switch`.

## Alternatives considered
- **A row in Settings**: hidden while playing, and it doesn't answer "why is nothing happening?".
- **Saving it in the patch**: a shared patch could arrive silent.
