---
id: UI-0015
title: "HOST: the power switch's third cell hands power to the DAW transport"
status: accepted
date: 2026-11-16
domain: ui
tags: [power, plugin, ipad]
supersedes: []
superseded_by:
---
# UI-0015: HOST: the power switch's third cell hands power to the DAW transport

## Context
Owner (GarageBand on iPad, 2026-11-16, CHG-0025): in a DAW only the player's keys are recorded (MIDI); the particles
are not. A take played back with the world powered sounds as played (Play resyncs the world, so a take from a position
plays alike), but on Stop the world keeps running, and with it off the take loses its particles. The owner also wants
to play with emitters and lasers without running the transport. Of the mock-ups (a three-cell switch; a FOLLOW PLAY
toggle beside the switch; a row in Settings), the owner chose the three-cell switch.

## Decision
In DAW plugins (not the standalone app, not the web) UI-0008's switch gets a third cell after OFF (dash) and ON
(diamond): HOST, its icon the DAW's transport (▷ stopped, ■ playing). The switch is 90u wide (three 30u cells), drawn
with the same v1 OptionSwitch pieces.

- OFF and ON are UI-0008's: the world off or running, whatever the transport does.
- HOST: the world is powered while the DAW plays and off while it is stopped (so particles in flight vanish, as with
  OFF). Label: POWER · HOST PLAYING, or SYNCED TO HOST on the red of v1's record button (palette 13, as POWER OFF);
  underline green when playing, that red when stopped.
- The processor owns the mode (`setPowerMode`): it applies the power on the audio thread after the transport resync,
  ignores the page's power commands while in HOST, and saves HOST with the project (`plugin.powerMode`), so a project
  reopens synced. OFF is never restored (UI-0008: a project opens powered).
- The owner asked that pressing HOST again start or stop the DAW. A plugin can't: AUv3, AU and VST3 give it no way to
  press the host's play (JUCE's `AudioPlayHead::transportPlay` works only for Inter-App Audio, which Apple removed).
  Pressing HOST again shows USE THE HOST'S PLAY BUTTON for 2.5 s.

## Consequences
- Recording a part with HOST on and playing it back gives the same particles each time; Stop silences the world.
- The page learns the transport from the editor (`bd_hostState`, sent when it changes).
- Tests: plugin test "power HOST: off while the DAW is stopped, on when it plays" (and the mode survives save/reopen),
  ui-regressions `power-host-mode`.

## Alternatives considered
- **FOLLOW PLAY toggle beside the switch**: the switch would move by itself, which reads as a fault.
- **A row in Settings (FREE / WITH HOST)**: hidden while playing, the same objection as in UI-0008.
- **MIDI Start/Stop out to drive the host**: hosts don't take transport from a plugin's MIDI output (GarageBand, Logic).
