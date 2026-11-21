# CHG-0038 tasks: Stage in the plugins

Check items off as they land. Each task should be independently verifiable.

- [x] 1. Failing tests first: ui-regressions `plugin-stage`, `plugin-stage-make-and-copy`; plugin renders for a sampler
      inside a Stage and page edits inside a Stage.
- [x] 2. Processor: stage-tagged commands to inner worlds (made on first use), `bd_stageView`, `view` in snapshots,
      `bd_macros`, `innerIds` in `bd_patch`.
- [x] 3. Processor: samplers inside Stages (keys `<stage>/<block>`, restore, attach, sample events with `stage`).
- [x] 4. Page: Stage and Stage In in the plugins' menu; open, make, drop into, duplicate, LOAD PATCH; `stage` on
      sample events; frames of another world dropped; no Dust menu inside a Stage.
- [x] 5. Specs: SPEC-SIMULATION-POWER-AND-PARTICLES R13 (plugins attach inner samples), UI-0012 consequence updated.
- [x] 6. Gates, `bd plugin deploy`, `bd plugin ios device`, staging.
- [x] 7. Owner 2026-11-19: the Stage panel's OPEN STAGE / LOAD PATCH row in the plugins (ui-regressions `plugin-stage-panel-buttons`, failed before).
