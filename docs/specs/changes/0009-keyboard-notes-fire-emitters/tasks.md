# CHG-0009 tasks: Keyboard notes fire Emitters

Check items off as they land. Each task should be independently verifiable.

- [x] 1. Failing tests first: engine "R2 S5" (legato) and "R2 S6" (poly chord); ui `keyboard-legato-fires-emitter`,
  `keyboard-poly-chord-fires-emitter` (failed on main: legato 1 particle not 2, chord 1 not 3).
- [x] 2. Engine: each note-on fires the Emitter at its key's angle; held keys repeat (mono newest, poly every key);
  releasing the newest key re-aims at the newest held (SPEC-CONNECTIONS-PROXIMITY R2).
- [x] 3. Spec R2 + S5/S6 updated; goldens unchanged.
- [ ] 4. Owner review on the web build and the plugins.
