# CHG-0030 tasks: Envelope graph easier to set

Check items off as they land. Each task should be independently verifiable.

- [x] 1. Curved time axis around v1's ADSR row (`web/src/v1ui/adsrPanel.ts`)
- [x] 2. Held value above the graph, right-aligned; relative drag with Shift fine; nearest handle only
- [x] 3. Browser test (`pnpm test:ui-regressions --only envelope-short-attack`)
- [x] 4. Owner review on staging: log picked (2026-11-17); the `?adsr` switch and the other axes removed
- [x] 5. Plugin deploy and iPad build 
      iPad build passed the owner's check (2026-11-20).
