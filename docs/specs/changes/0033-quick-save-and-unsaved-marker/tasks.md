# CHG-0033 tasks: Quick save and unsaved marker

Check items off as they land. Each task should be independently verifiable.

- [x] 1. Port v1's MessagePanel (`bd v1 port-ui`) and draw it over the panels, as v1 did
- [x] 2. Cmd/Ctrl+S: quick save over the own link; otherwise Patches › SAVE; DAW passes it on (R18)
- [x] 3. Top-left line: title, UNSAVED, SAVE under the mouse (R19); unsaved after reload (R20)
- [x] 4. Tests: `quick-save` (sharing), `quick-save-no-link-opens-save`, `quick-save-plugin-keys` (UI regressions)
- [x] 5. Owner: check the corner and the SAVED bar on staging
      Owner passed (2026-11-20).
