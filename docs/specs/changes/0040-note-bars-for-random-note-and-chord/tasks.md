# CHG-0040 tasks: Note bars for Random Note and Chord

Check items off as they land. Each task should be independently verifiable.

- [x] 1. Proposal, spec rules (R10e, R10f, R10h), AUDIO-0002 rewritten, UI-0016.
- [x] 2. Mock-ups from v1 panel parts (note bars, range slider, drag label; desktop + phone); owner approval.
- [x] 3. Engine, test-first: manifests + `pnpm bd codegen`; weighted pick, semitone range, keys only trigger
      (failing polyphony test first); per-note chord qualities, Key, Smooth voicing; goldens updated.
- [x] 4. Web UI: note-bars row, range slider, Key slider, drag label, light-up; LFO targets; ui-regressions.
- [ ] 5. `pnpm bd patches migrate` (blocks + Stage macros, dry run, D1 export first); staging, then production.
      Tool and golden fixtures done; the D1 runs wait for the owner's go.
- [ ] 6. Gates (`bd index --check`, engine, render, wasm/worklet, web, ui-regressions, plugin test); plugin deploy
      (MBP), iPad build, staging deploy + smoke.
