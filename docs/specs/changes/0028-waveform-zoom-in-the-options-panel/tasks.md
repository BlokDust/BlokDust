# CHG-0028 tasks: Waveform zoom in the options panel

Check items off as they land. Each task should be independently verifiable.

- [x] 1. View window over v1's panel (`web/src/v1ui/waveZoom.ts`): narrowed form, recomputed waveform, clipped draw, hidden handles, position bar
- [x] 2. Gestures: wheel, Ctrl + wheel, sideways swipe, drag-pan, two-finger touch, Safari gesture events; none zoom the stage
- [x] 3. Playheads map through the window
- [x] 4. Browser test (`pnpm test:ui-regressions --only waveform-zoom`)
- [ ] 5. Owner check (web, iPad/phone, trackpad, plugin)
