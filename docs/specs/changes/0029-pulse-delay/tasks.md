# CHG-0029 tasks: Pulse delay

Check items off as they land. Each task should be independently verifiable.

- [x] 1. Manifest params `delay`, `delayBeats` (appended); codegen
- [x] 2. Engine tests first (`test_pulse_delay.cpp`), then the engine: per-hit waits, fired at the start of a tick, cleared by world POWER off and transport start
- [x] 3. Golden `pulse-strum` (others unchanged)
- [x] 4. Options panel Delay row, free and synced; browser test `pulse-delay`; `tempo-sync-options` updated
- [x] 5. Spec R2b, SIMULATION-0010
- [x] 6. Owner check (web, plugin): web checked; plugin still to check
      Owner passed (2026-11-20).
