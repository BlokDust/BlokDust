# CHG-0022 tasks: Video export

Check items off as they land. Each task should be independently verifiable.

- [x] 1. Move the stage's world drawing into `web/src/stage/drawWorld.ts` (no visual change: `bd visual diff --full`
  525/525, ui-regressions)
- [x] 2. Session log in the AudioWorklet (R1, R3, R4)
- [x] 3. Offline replay + frame renderer (R2, R5–R9, R12)
- [x] 4. MP4 encoding with Mediabunny + AAC fallback (R10, R11)
- [x] 5. Share sheet / download (R13, R14)
- [x] 6. Patches › VIDEO tab (R15, R16)
- [x] 7. `pnpm test:video`: replay ≡ worklet; ffprobe on the MP4s (codecs, size, 30 fps, length, sound, moving
  particles); repeatable frames; cancel; regression `cancel-then-make-at-once`
- [ ] 8. Owner check (desktop, phone, a real post to Instagram / TikTok)
