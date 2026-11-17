# CHG-0029 tasks: Envelope graph easier to set

Check items off as they land. Each task should be independently verifiable.

- [x] 1. Curved time axis around v1's ADSR row (`web/src/v1ui/adsrPanel.ts`), `?adsr=log|square|v1`
- [x] 2. Held value on the title row; relative drag with Shift fine; nearest handle only
- [x] 3. Browser test (`pnpm test:ui-regressions --only envelope-short-attack`)
- [ ] 4. Owner review on staging: pick the axis, then drop the switch and the other variants
- [ ] 5. Plugin deploy and iPad build after the pick
