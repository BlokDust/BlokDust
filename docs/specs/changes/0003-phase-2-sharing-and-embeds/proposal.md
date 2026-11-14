---
id: CHG-0003
title: Phase 2 sharing and embeds
status: approved
date: 2026-11-07
specs: [SPEC-SHARING-BACKEND, SPEC-PATCH-FORMAT-V2, SPEC-VISUAL-V1-PARITY]
adrs: [SHARING-0001, SHARING-0002, SHARING-0004, DATA-0005, ARCHITECTURE-0003, SCOPE-0003, PROCESS-0004]
---
# CHG-0003: Phase 2 sharing and embeds

## Why
Phase 1 shares a patch by stuffing the whole patch into the URL, which works but makes long links. Those links don't
preview in chat apps or social feeds, and they can't be embedded. v1 saved compositions to a server: you got a short
`?c=<id>` link, could overwrite it later, and other people could remix it. Phase 2 brings that back on the Cloudflare
free tier (SHARING-0001) and makes shared patches playable where they're posted (SHARING-0002). It also restores v1's
online sample search with Freesound in place of SoundCloud (DATA-0005).

## What changes
1. **Backend** (`server/`, new spec SPEC-SHARING-BACKEND):
   - A Cloudflare Worker with D1 that also serves `web/dist` as static assets.
   - Two deployments: `blokdust-staging` for review and `blokdust` for production, each with its own D1 database.
   - API: create, Save (overwrite with the edit token), Save As (a new id with `parent` set), load, delete. Every save
     is stored as a revision, and links open the latest one. The owner chose v1's save semantics on 2026-11-07, which
     amends SHARING-0001's "immutable" rule.
   - Turnstile on saves, size limits, and every absolute URL built from `PUBLIC_BASE_URL` (SHARING-0004).
2. **Share panel, wired to the server:**
   - v1's Generate link, Overwrite and Create new map to SAVE_AS and SAVE. The edit token is kept in the creator's
     browser, as v1's `SessionId` was. The link is `?c=<id>&t=<Title>`, as in v1.
   - Phase 1 `?c=p…` links still open.
   - When the server can't be reached, Share falls back to a Phase 1 patch link.
   - The panel warns when the patch is not portable (local files, Recorder).
3. **Thumbnails, Open Graph and oEmbed:**
   - A PNG thumbnail is rendered from the stage at save time and stored with the patch.
   - Share pages get Open Graph and `twitter:card` tags, inserted by the Worker.
   - `/oembed?url=` returns a rich iframe embed, and pages carry oEmbed discovery links.
4. **Embed player** `/embed/<id>`:
   - The same bundle (ARCHITECTURE-0003) in player mode: the stage fitted to the frame, no editing chrome, and a
     tap-to-start overlay.
   - Blocks can still be pressed, and there's a link to open the patch in the full app.
5. **Samples (DATA-0005):**
   - Patches keep `refs` for samples: `freesound` refs, and `file` refs with a fingerprint.
   - v1's SoundcloudPanel is ported verbatim and searches Freesound through a Worker proxy that holds the API key as
     a secret. Previews come straight from Freesound's CDN.
   - A Freesound attribution line (title, user, licence) appears on the block and in the embed.
   - On Chromium, a user's file is reopened after a reload via a File System Access handle kept in IndexedDB.
     Elsewhere, and for recipients, the block shows a "sample missing" state with a way to pick a file or search
     Freesound.
   - Applies to Sample, Granular and Convolver.
6. **Tools and tests:**
   - `bd server`: dev, migrate, deploy, secret, and a smoke test against a deployed URL.
   - `pnpm test:sharing`: runs against a local `wrangler dev` with a test Turnstile key and a mock Freesound.
   - New `bd ui` fixtures for the sample-search panel, captured from v1 with mocked SoundCloud results.
   - Plus a test for every bug found along the way (testing-strategy §4).

## Out of scope
- Accounts, galleries and moderation (SCOPE-0003).
- MP4 social previews (SHARING-0002).
- The custom domain: the site stays on workers.dev (SHARING-0004).
- Granular's grain engine (Phase 3).
- Plugin-side file relinking (Phase 3).

## Acceptance
`pnpm test:sharing` (local, part of `bd ci`):
- **Share and load:**
  - Generate a link, then open it in a fresh browser: same patch, and an identical offline render hash.
  - Overwrite keeps the id, and the reloaded link shows the change.
  - Create new makes a new id with `parent` set.
  - A wrong or missing edit token is refused.
  - A failed Turnstile check is refused.
  - A patch over 64 KB is refused.
- **Embed:** `/embed/<id>` inside an iframe on another origin plays sound after one tap (the AudioWorklet output is
  not silent).
- **oEmbed and previews:**
  - `/oembed` returns valid rich JSON.
  - The share page has Open Graph and twitter tags, plus a thumbnail URL that returns a PNG.
- **Samples:**
  - A Freesound search shows results in the ported panel, and picking one plays.
  - Shared, the recipient loads the same sound and gets an identical render hash.
  - A `file` sample shows "sample missing" for a recipient.
  - The Share panel warns about the file sample.

Everything else:
- `pnpm bd ui diff`: the new sample-search states match v1, with only the provider name masked.
- `pnpm bd server smoke --env staging`: the same flow against the deployed staging Worker, with real Freesound.
- Every Phase 1 gate stays green (`pnpm bd ci`).
- Owner review on `<configured-staging-url>`.

## Risks and unknowns
- **Turnstile in headless browsers:** automated runs use Cloudflare's test keys. The staging smoke test may need to
  call the API directly if the real widget challenges headless Chromium.
- **Freesound rate limits** (60 requests per minute and 2000 per day per key): the proxy caches searches. Freesound
  previews are lossy MP3; decoding is deterministic on one browser build but may differ between browsers.
- **Social crawlers** need tags in the HTML itself, which is why the Worker inserts them. X/Twitter player cards are not
  relied on (SHARING-0002).
