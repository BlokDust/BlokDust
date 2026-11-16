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
- [ ] 11. Owner: create the Sentry project (EU), the Access application for `/admin/*` on staging and production, and
      an Account Analytics: Read API token (`~/.config/blokdust/analytics_token`); then `pnpm bd server secret` and
      deploy staging.
- [ ] 12. Owner: Cloudflare notifications (Workers usage) and, before public sharing, Workers Paid; then set
      `BLOKDUST_PRODUCTION_ANALYTICS_RATE` (e.g. 1) and deploy production.
- [ ] 13. Staging check: dashboard shows real rows; Sentry receives a test error with scrubbed URL.
- [ ] 14. Manual plugin check: a local Worker + `BLOKDUST_EVENTS_URL`, one ping per day, none after switching off.
- [ ] 15. Follow-ups: plugin page events via the bridge; `plugin_error`; D1 roll-ups past 3 months; events for the
      Stage block, labels, video export, accounts and gallery when those merge; the iPad AUv3 ping (CHG-0025).
