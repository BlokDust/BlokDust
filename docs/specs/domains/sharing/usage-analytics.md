---
id: SPEC-SHARING-USAGE-ANALYTICS
title: Usage analytics
status: draft
domain: sharing
adrs: [SHARING-0010]
updated: 2026-11-16
---
# Usage analytics

## Purpose
What BlokDust records about how it is used, how, and how the user turns it off: anonymous product events from the
website, embeds and plugins into Workers Analytics Engine, error reports from the website into Sentry, and the private
dashboard that reads them. It matters because it must answer the owner's questions without a cookie banner, without
identifying anyone, and without endangering the shared Cloudflare account.

## Requirements
- **R1.** Nothing MUST identify a person: no cookies, no stored ids on the web, no raw IP, user agent, patch content,
  search text, file or sample names, share ids or titles in any event.
- **R2.** Only the events and properties in `server/src/events.ts` MAY be recorded. Block additions SHOULD be summed per
  block type and sent at most once a minute or when the page hides, so a session sends on the order of 5–15 events.
  The OS and browser MUST be reduced to a coarse name by the Worker.
- **R3.** `POST /api/events` MUST accept a batch `{surface, v, w?, install?, os?, events[]}` only if the surface is
  listed, the version is a short token, there are at most 50 events and the body is at most 8 kB (400 / 413
  otherwise). Unknown events and server-only events MUST be dropped, string properties MUST match their list, token
  or domain rule (else stored empty), numbers MUST be finite and clamped. It MUST be rate-limited per IP.
- **R4.** Web visitors MUST be counted by a hash of a daily random salt, the IP and the user agent. The salt MUST be
  shared by all isolates on a day (D1) and earlier days' salts MUST be deleted.
- **R5.** The Worker MUST tell each page the share of sessions that send events (`ANALYTICS_RATE`, 0 … 1; meta tag
  `blokdust-analytics` and `/api/config`). With 0 nothing MUST be sent or recorded (kill switch). A sampled session's
  events MUST carry the weight 1/rate. Production MUST default to 0.
- **R6.** The Worker MUST record shares (`patch_shared`), Freesound searches and Freesound errors itself, without
  changing the responses; a client MUST NOT be able to send these events.
- **R7.** Settings › About MUST show a small switch, "Anonymous usage stats: on/off", beside the version number. On the
  website it turns events and error reports off in that browser (remembered); a browser sending Global Privacy
  Control MUST be treated as off. In a plugin it MUST set the install's choice (all projects on that computer).
- **R8.** A plugin MUST send at most one `plugin_active` event a day per install, when its window opens, never on the
  audio thread, with: format, instrument or FX, DAW name and version, OS, CPU architecture, BlokDust version and a
  random install id (stored by the Worker only as a hash). It MUST NOT send when the user has turned it off (and
  turning it off MUST forget the install id), when `BLOKDUST_NO_TELEMETRY=1` (validators, test hosts) or for formats
  other than VST3, AU, AUv3 and the standalone app. The Worker MUST accept plugin events only from a plugin surface
  with a well-formed install id. The reply MUST be ignored beyond its status.
- **R9.** The website MUST load Sentry only when the Worker names a DSN and usage stats are on, with errors only (no
  tracing, no replay, no breadcrumbs), no user, cookie, header, body or query-string collection (`dataCollection`), IP storage off in the project, query strings removed from URLs and file names and share
  ids removed from messages. Plugins MUST NOT install a crash handler.
- **R10.** The dashboard (`/admin/analytics`, data at `/admin/analytics/data?days=N`) MUST answer 404 unless Cloudflare
  Access is configured for it (or, in local tests only, `ADMIN_LOCAL=1`), and 403 unless the request carries a valid
  Access token (RS256, the team's keys, issuer, audience, expiry). It MUST run only fixed queries; only the day count
  (an integer, 1–90) varies. The query token MUST stay on the server.
- **R11.** The dashboard MUST show client-sent values as text only and send a CSP that allows only its own (nonce)
  script and style, no framing.
- **R12.** A privacy note (`/privacy.html`) MUST describe what is recorded, why, for how long, Sentry as a processor, and
  how to turn it off, and be live, and linked from the About footer, before production's rate is above 0. Owner
  (2026-11-16): the footer link is left out until then (it pointed at production, which doesn't serve the page yet).

## Scenarios
- **S1.** Given a visitor on the website with usage stats on, when they start audio and add three Tone blocks, then the
  Worker records session_start, patch_opened, audio_started and one block_added {type: source.tone, count: 3}. (R2, R4)
- **S2.** Given `ANALYTICS_RATE=0`, when any page loads or any batch arrives, then nothing is recorded. (R5)
- **S3.** Given a visitor presses "Anonymous usage stats: on", when they reload and play, then nothing is sent. (R7)
- **S4.** Given BlokDust FX opened in Ableton Live 12.1 on an M-series Mac for the first time today, then one
  plugin_active {fx, Ableton Live 12, 12.1, arm64} is sent; opening it again that day sends nothing. (R8)
- **S5.** Given a request to /admin/analytics without Access's token, then 403. (R10)

## v1 reference
v1 used Google Analytics (`App.Analytics`, removed in the port). v2 deliberately records far less and nothing personal.

## Verification
- `pnpm test:analytics` (tests/e2e/analytics.ts): R3, R5, R6, R7, R8 (Worker side), R10, R11, S2, S3, S5.
- `pnpm test:ui-regressions` settings-release1: the footer holds only the code link until R12's link returns.
- R8 plugin side: `pnpm bd plugin test` (pings off under the tool), and a manual check against a local Worker with
  `BLOKDUST_EVENTS_URL` (CHG-0026 tasks).
- R9: manual, with a staging DSN (CHG-0026 tasks).

## Open questions
- Roll-ups to D1 for trends beyond Analytics Engine's 3 months.
- Events from the plugin's own page (block types in DAWs) through the native bridge.
- `plugin_error` from the processor (sample load failures); listed in events.ts, not sent yet.
