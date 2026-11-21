# CHG-0026 tasks: Usage analytics

Check items off as they land. Each task should be independently verifiable.

- [x] 1. Event list shared by Worker and web (`server/src/events.ts`); SHARING-0010 and SPEC-SHARING-USAGE-ANALYTICS.
- [x] 2. Worker ingest `POST /api/events` (R2–R4), daily salt in D1 (migration 0002), rate limit, kill switch (R5).
- [x] 3. Worker-recorded events: patch_shared, freesound_search, freesound_error (R6).
- [x] 4. Web client and app hooks: session_start, patch_opened, audio_started/failed, wasm_unsupported, block_added
      (per type), sample_loaded, patch_created, patch_saved, save_failed, midi_connected, keyboard_played, perf,
      session_summary, embed_opened_full (R2).
- [x] 5. Settings › About switch beside the version number; Privacy footer link; `/privacy.html` (R7, R12).
- [x] 6. Sentry for the web, lazy, EU, scrubbed, off without a DSN or when usage stats are off (R9).
- [x] 7. Plugin daily ping with DAW name and version (macOS bundle / Windows file version), opt-out via the About
      switch over the bridge (`bd_analytics`), off under `bd plugin`, the Windows VM scripts and
      `BLOKDUST_NO_TELEMETRY=1` (R8).
- [x] 8. Dashboard `/admin/analytics` behind Access (JWT checked in the Worker), fixed queries, CSP (R10, R11);
      `pnpm bd analytics`.
- [x] 9. Config: datasets and rate limits per env; Access / Sentry / rate from local config; query token secret.
- [x] 10. `pnpm test:analytics` (tests/e2e/analytics.ts).
- [x] 11. Owner: the Sentry project (EU), the Access application for `/admin/*` on production, and an Account
      Analytics: Read API token (`~/.config/blokdust/analytics_token`); `pnpm bd server secret`; staging deployed.
      Staging has no Access application (owner, 2026-11-20): Access on workers.dev would cover the whole staging host,
      so its `/admin/*` answers 403 and `pnpm bd analytics --env staging` runs the same queries.
- [ ] 12. Owner: Workers Paid and a Billing Budget Alert (done, 2026-11-20); `BLOKDUST_PRODUCTION_ANALYTICS_RATE=1` in
      local config (done). Left: deploy production after the merge.
- [x] 13. Staging check: `bd analytics --env staging` shows real rows; Sentry receives a test error with the URL's query
      string removed, no IP and no breadcrumbs (owner, 2026-11-20).
- [x] 14. Manual plugin check: a local Worker + `BLOKDUST_EVENTS_URL`, one ping per day, none after switching off.
      2026-11-20, macOS Standalone from 924772e: a fresh install sends one `plugin_active` (200, accepted 1) and records
      `lastPing`; a second launch the same day sends nothing; the next day sends one with the same install id; with
      the settings file as the About switch leaves it (`usageStats` 0, no install id) nothing is sent.
- [ ] 15. Follow-ups: plugin page events via the bridge; `plugin_error`; D1 roll-ups past 3 months; events for the
      Stage block, labels, video export, accounts and gallery when those merge; the iPad AUv3 ping (done: CHG-0025 task 12c).
