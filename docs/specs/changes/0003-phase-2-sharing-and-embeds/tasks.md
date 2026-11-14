# CHG-0003 tasks: Phase 2 sharing and embeds

- [x] 2.1 `server/` Worker + D1 schema/migrations, API (create, save, save-as, load, delete, thumbnail), Turnstile, limits; `bd server dev|migrate|deploy|secret|smoke`
- [x] 2.2 Share panel wired to the API (SAVE / SAVE_AS, edit token as v1 SessionId, `?c=<id>&t=`), `?c=p…` still loads, offline fallback, non-portable warning
- [x] 2.3 Thumbnails at save; Open Graph / twitter tags and oEmbed discovery injected by the Worker; `/oembed`
- [x] 2.4 `/embed/<id>` player mode (fit to frame, tap-to-start, open-in-BlokDust link)
- [x] 2.5 Sample refs in the patch (`refs`, freesound + file with fingerprint), "sample missing" state, File System Access handle persistence (Chromium)
- [x] 2.6 Freesound: Worker search proxy (secret key, cache), v1 SoundcloudPanel ported, attribution; v1 references for the panel (`bd ui`)
- [x] 2.7 `pnpm test:sharing` (local wrangler dev, test Turnstile, mock Freesound) in `bd ci`: 56/56; staging deployed, `bd server smoke --env staging` 46/46 in real Chrome (real Turnstile + Freesound); `bd ci` 21/21 green (2026-11-07). Production D1 + Turnstile created (`bd server setup --env production`), not deployed until the merge is approved
- [x] 2.8 Specs (SPEC-SHARING-BACKEND, patch-v2 refs), SHARING-0001 amendment, roadmap, AGENTS.md ✓; owner review on <configured-staging-url>: approved 2026-11-07
- [x] 2.9 Found along the way, each with a test that failed first: typing in a text field played the computer keyboard (`ui-regressions` typing-plays-no-notes: 6 notes before, 0 after); Convolver kernel over-read its impulse buffer on the last tail partition (ASan: 50 engine tests aborted; existing direct-convolution test is the regression, `bd ci` asan step); hardening: per-IP rate limits on saves and Freesound lookups (R5a, tested)
- [x] 2.10 Owner review 1 of Phase 2 (2026-11-07), each with a test that failed first:
  - (1) Looping played a different region from the panel: a new sample reset the region only in the panel, so the
    engine kept the old sample's. Restored patches had no region at all, so the loop handles sat at 0. Test
    `sample-loop-region`.
  - (2, 3) Reverse now flips the waveform at once and mirrors start, end and loop. The engine restarts voices (v1).
    Tests `sample-reverse-mirrors` and engine "Review 2026-11-07".
  - (2, 6) Loading state: v1's AnimationsLayer is ported, which also restores the Share "saving…" and search spinners.
    Test `sample-loading-indicator`.
  - (6) The Convolver downloads only the start of a preview (Range, ≤ 120 kB). Test
    `convolver-downloads-only-what-it-uses`. Measured on staging: 2.0 s from pick to loaded, mostly Freesound's CDN.
  - (5) Share link opened the default stage: not reproduced in Chrome, WebKit or Firefox, on staging or Tailscale. The
    owner's exact steps are now `sharing.ts` `share-new-tab` (passes). Owner could not reproduce it again either (2026-11-07); the test stays.
- [ ] 2.11 (4) Launch Tutorial does nothing: v1's tutorial is not ported. Captured as KNOWN `launch-tutorial`;
  scheduled after Phase 2.
- [x] 2.12 Owner review 2 (2026-11-07): the options panel's waveform loading square did not spin (v1 RefreshOptionsPanel("animate") / OptionsPanel.Animating ignored). `sample-region-spinner` failed with 0 change, now 236. Phase 2 approved for merge
