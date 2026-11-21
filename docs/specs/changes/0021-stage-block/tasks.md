# CHG-0021 tasks: Stage block

Check items off as they land. Each task should be independently verifiable.

- [x] 1. Patch format: `macros` used (SPEC-PATCH-FORMAT-V2 R7); web, render tool and plugin loaders
- [x] 2. Engine: inner worlds, power gating, one level, tests (`engine/tests/test_stage.cpp`, R13)
- [x] 3. Stage block manifest and panel (Volume, OPEN STAGE, LOAD PATCH from a file)
- [ ] 3a. Load patch from a share link (not built: file only)
- [x] 4. Make stage from selection (drag Stage from the menu with blocks selected, or Cmd/Ctrl+G)
- [x] 5. Inside view (UI-0009) desktop + phone layout
- [x] 6. Golden `stage-nested`; browser tests `pnpm test:new-blocks -- --only stage,stage-from-selection`
- [x] 6a. Keep Particles (R13b, owner review 4): engine `test_stage.cpp`, browser `stage-keep-particles`
- [x] 7. Owner check (desktop, iPad, phone)
      Owner passed (2026-11-20). Loading a Stage from a share link (3a) stays open.
