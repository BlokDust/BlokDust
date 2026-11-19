---
id: CHG-0038
title: Stage in the plugins
status: done
date: 2026-11-19
specs: [SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-PATCH-FORMAT-V2]
adrs: [SCOPE-0006, UI-0009, UI-0012, PLUGIN-0001]
---
# CHG-0038: Stage in the plugins

## Why
The owner wants the plugins (VST3, AU, the standalone apps, the iPad app and its AUv3) to work as the website does:
anything made in the browser opens and plays the same there. CHG-0021 left Stage blocks out of the plugins: they
play a patch's Stages, but cannot make, open or fill one, and samplers inside a Stage are silent there (the processor
loads audio only for the outer world's samplers). Owner, 2026-11-19: "make the updates to include stages in the
plugins and iPad app", the same as the browser.

## What changes
- **The menu and the page.** Stage (Sources) and Stage In (inside a Stage) are in the plugins' block menu. OPEN
  STAGE, a double click, MAKE STAGE from a selection, dropping blocks onto a Stage, duplicating one and the Stage
  panel's LOAD PATCH work as on the web (CHG-0021).
- **The bridge.** Commands the page sends while looking into a Stage carry `stage` (the Stage block's engine id),
  as the web worklet's do; the processor gives them to that Stage's inner world, made on first use off the audio
  thread (the callback lock held while it is attached, as `rebuildEngine` swaps engines). `bd_stageView {stage}` picks
  the world the snapshots come from (0: the outer one); each snapshot says which (`view`), and the page drops frames
  of a world it isn't showing. `bd_macros {macros}` keeps the processor's patch (the DAW project's state) in step with
  what is inside each Stage; the processor keeps the sample fields it owns (track, name, user, link).
- **Samplers inside a Stage** get their audio in the plugins (SPEC-SIMULATION-POWER-AND-PARTICLES R13: the host attaches it). Their key
  is `<stage id>/<block id>`; picking a file, a Freesound sound, recording, SampleGen, revealing and file drops carry
  `stage` from the page, and the processor's sample reports carry it back. Blocks moved into a Stage keep the audio
  they had (the loaded sound is reused by its `track`).
- **Ids after a reload.** `bd_patch` brings `innerIds` (each Stage's inner blocks' engine ids), as `ids` for the
  outer world, so a reopened editor edits the right inner blocks.
- **Patches without Stage blocks are untouched:** the engine and the audio path don't change; no inner world is made
  and nothing new is sent (golden hashes and the plugin renders stay identical).

## Out of scope
- Dust 1–8 and MIDI-learn on blocks inside a Stage (the Dust menu is not offered there; the web has no Dust).
- Stages inside Stages (one level, SCOPE-0006).

## Acceptance
- `pnpm bd plugin test`: new renders "Stage: a sampler inside plays its file", "Stage: page edits reach the inner
  world, saved and reopened"; all existing renders unchanged (pluginval pass).
- `pnpm test:ui-regressions`: `plugin-stage` (menu has Stage; entering sends `bd_stageView`, tagged commands and
  `bd_macros`; snapshots of another world are dropped), `plugin-stage-make-and-copy` (MAKE STAGE and a copied Stage: what is
  inside goes to the new Stage's inner world, not the outer one, and `bd_macros` names it; fails before this change).
- `pnpm bd render --check` and `pnpm test:engine` unchanged.
- On the MBP (`bd plugin deploy`) and the iPad (`bd plugin ios device`): make a Stage, open it, add a Sample inside,
  close, save the DAW project, reopen: it plays the same.

## Risks and unknowns
- Attaching a new inner world holds the callback lock for a moment (a block of silence at most), once per Stage
  made while the DAW plays.
- The page and the processor both edit a macro's sampler fields; the processor's own fields win (above).
