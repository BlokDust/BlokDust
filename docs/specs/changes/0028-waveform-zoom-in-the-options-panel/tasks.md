# CHG-0028 tasks: Waveform zoom in the options panel

Check items off as they land. Each task should be independently verifiable.

- [x] 1. View window over v1's panel (`web/src/v1ui/waveZoom.ts`): narrowed form, recomputed waveform, clipped draw, hidden handles, position bar
- [x] 2. Gestures: wheel, Ctrl + wheel, sideways swipe, drag-pan, two-finger touch, Safari gesture events; none zoom the stage
- [x] 3. Playheads map through the window
- [x] 4. Browser test (`pnpm test:ui-regressions --only waveform-zoom`)
- [ ] 5. Owner check (web, iPad/phone, trackpad, plugin)
      2026-11-20 owner: failed (recording): zoomed in, the waveform slid at a different speed from the markers and drew
      only part of the row. Cause: v1's GetWaveformFromBuffer rounds a short window's parts up (the plugins' page has
      only the processor's preview; the website at deep zoom), cutting the waveform short and snapping it to whole
      values. Fixed: exact-edge peaks in waveZoom.ts; the processor's preview is 4000 peaks (was 4096 single samples).
      Tests `waveform-zoom-lines-up`, `waveform-zoom-plugin-preview` (tests/e2e/ui-regressions/waveform.ts), failing
      first. Owner to check again.
