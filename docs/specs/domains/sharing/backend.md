---
id: SPEC-SHARING-BACKEND
title: Sharing backend, embeds and sample references
status: draft
domain: sharing
adrs: [SHARING-0001, SHARING-0002, SHARING-0004, DATA-0005, SCOPE-0003]
updated: 2026-11-17
---
# Sharing backend, embeds and sample references

## Purpose
Saving and sharing patches the way v1 did (short `?c=<id>` links, Overwrite and Create new), on the Cloudflare free tier
(SHARING-0001). Shared patches are playable where they are posted (SHARING-0002), and samples travel as references,
never as audio (DATA-0005). The Worker is `server/`; the client is `web/src/patch/server.ts`.

## Requirements
**Storage and API** (`server/src/patches.ts`)
- **R1.** A share id is 10 base62 characters and MUST NOT start with `p`: `?c=p…` stays a self-contained Phase 1 patch
  link (SPEC-PATCH-FORMAT-V2 R5b). Both kinds MUST open.
- **R2.** Each id has revisions. `GET /api/patches/:id` returns the latest one: `{id, rev, title, parent, created, updated, patch}`.
- **R3.** `POST /api/patches` (v1 SAVE_AS: Generate share link, Create new) MUST create a new id and return a secret edit
  token. Only the token's SHA-256 is stored. `parent` records the patch it came from (a remix).
- **R4.** `PUT /api/patches/:id` (v1 SAVE: Overwrite) MUST require `Authorization: Bearer <edit token>` and adds a
  revision under the same id. `DELETE` needs the token too and removes every revision. Without the token: 403, unless
  the request is signed in to the account that owns the patch (SPEC-SHARING-ACCOUNTS R9).
- **R5.** Every save (R3, R4) MUST carry a Turnstile token that Cloudflare's siteverify accepts. Without a configured
  secret, saving is refused (it fails closed).
- **R5a.** Per-IP limits (Workers rate limiting): 20 saves a minute, and 60 Freesound lookups a minute (one shared API
  key, 2000 a day). Over the limit the Worker returns 429.
- **R6.** A patch MUST be a v2 patch of 64 KB or less (SPEC-PATCH-FORMAT-V2 R6). The title is at most 64 characters.
  The thumbnail is an optional PNG of 512 KB or less.
- **R7.** The client keeps edit tokens in localStorage, keyed by id (v1 `App.SessionId`). The Share panel offers
  Overwrite and Create new only for an id this browser holds the token for; otherwise it shows Generate share link. A
  saved link goes into the address bar (v1 AddressBarManager). Unsaved edits to your own link survive a reload. If
  the backend is unavailable, sharing falls back to a `?c=p…` link.

**Freesound** (`server/src/freesound.ts`)
- **R8.** `GET /api/freesound/search?q=` and `GET /api/freesound/sounds/:id` proxy Freesound with the key held as a
  Worker secret. They return only sounds of 510 s or less (v1's SoundCloud limit) under CC0, CC-BY or CC-BY-NC, and
  results are cached for a day. Audio is never proxied or stored: the browser fetches previews from Freesound's CDN.

**Pages, previews and embeds** (`server/src/pages.ts`)
- **R9.** `/` with `?c=<id>` and `/embed/<id>` MUST serve the app with Open Graph tags (title, description, url, a
  1200×630 PNG `og:image` saved with that revision), `twitter:card=player` with `twitter:player`, and an oEmbed
  discovery link. Every absolute URL comes from `PUBLIC_BASE_URL` (SHARING-0004).
  - `og:title` is the patch title alone (`og:site_name` already says BlokDust); `og:description` says what BlokDust
    is: "Connect blocks to make sounds, instruments and self-playing music. Free on the web and as a VST/AU plugin."
  - The image is the share card the app draws when saving: the stage cropped around its blocks, with the title (and
    "— by <handle>" once accounts exist) bottom left and a dimmed "BLOKDUST" bottom right, in v1's Dosis and the
    theme's text colour. Untitled patches show the mark alone.
- **R10.** `/oembed?url=<share or embed URL>` MUST return oEmbed 1.0 `rich` JSON: an iframe to `/embed/<id>`, 640×400
  by default, scaled down to fit `maxwidth` and `maxheight`, plus the thumbnail. Other hosts and unknown ids return 404.
  Only `format=json` is supported (501 otherwise).
- **R11.** `/embed/<id>` is the player:
  - the stage without the v1 menus or panels, and no autosave;
  - one tap starts audio;
  - blocks can be pressed but not moved;
  - an "Open in BlokDust" link to the share page;
  - it can be framed by any site. The app itself is SAMEORIGIN.

**Sample references** (client, DATA-0005)
- **R12.** Sampler blocks (Sample, Granular, Convolver) keep `track` as a reference key, `freesound:<id>` or
  `file:<name>`. The patch's `refs` map holds the metadata for each key:
  - Freesound: name, user, licence and preview URL;
  - a file: name, byte size, duration and a SHA-256 fingerprint of its first and last 64 KB.
- **R13.** On load, a `freesound` reference is fetched and decoded from its preview URL, and looked up through R8 if
  that fails.
  - A `file` reference loads from a File System Access handle kept in IndexedDB (Chromium), keyed by fingerprint,
    when permission is still granted. Otherwise the block is "sample missing", shown in its options panel. Choosing a
    file or a Freesound sound fixes it.
  - A file whose fingerprint differs from the reference is accepted, and its reference is updated.
- **R14.** The Share panel warns when the patch is not portable (it has `file` samples or a Recorder), as v1 warned
  about Recorders.
- **R15.** The sample panel is v1's SoundcloudPanel, ported verbatim and searching Freesound: random first search,
  pages of 5, search box, randomise, close. A "your file" button opens the file picker, and audio files dropped on a
  sampler block load into it. The options panel credits a Freesound sound ("By <user>"), and its reference keeps the
  licence and URL.

- **R16.** While a sampler's audio downloads or decodes, v1's loading animation (AnimationsLayer: a spinning diamond in
  a bubble beside the block) shows. The previous sound keeps playing until the new one is ready. The Convolver uses
  only the first 2.5 s of an impulse response, so it requests just the start of a Freesound preview (an HTTP Range).
  Audio is fetched by the browser and kept in memory only; it never passes through or onto our servers.
- **R17.** A newly loaded sample resets its region (start 0, end = length, loop from half way, as v1 Sample.SetBuffers),
  and the region is saved in the patch and sent to the engine, so looping plays what the panel shows. Reverse flips the
  waveform at once and mirrors the start, end and loop points (owner request; v1 kept the numbers, which selected
  different audio). The engine restarts sounding voices on reverse, as v1's RetriggerActiveVoices did.

**Quick save** (client, CHG-0033)
- **R18.** Cmd/Ctrl+S saves the patch over this device's own link (R7, or the account's): the same id and title, the
  gallery left as it is, no video and no panel. v1's message bar (MessagePanel) then says SAVED; with nothing changed
  it says SAVED without sending anything. A failed save says v1's "Save failed, please try again." and changes nothing
  (never a `?c=p…` link). With no link of its own (never saved, someone else's patch), and in the standalone app,
  Cmd/Ctrl+S opens Patches › SAVE. In a DAW the key is left to the DAW. It never opens the browser's "Save page".
- **R19.** On the stage, top left (where another person's patch shows "TITLE BY @NAME"), your own saved patch shows its
  title. Changed since it was saved, it reads `TITLE  ·  UNSAVED` (UNSAVED dimmed). Under the mouse UNSAVED reads SAVE,
  underlined like the corner's other links; pressing it does R18. While saving it reads SAVING.
- **R20.** Unsaved edits to your own link come back after a reload (R7) and show as UNSAVED. Nothing saves on its own.

## Scenarios
- **S1.** Given a patch, when its creator presses Generate share link and someone else opens the link in a fresh
  browser, then they get the same blocks and an identical offline render hash (R2, R3).
- **S2.** Given a saved link, when its creator changes a slider and presses Overwrite, then the same link shows the
  change. When they press Create new, they get a new id whose parent is the old one (R3, R4, R7).
- **S3.** Given a share link, when it is pasted into a site that supports oEmbed, then the site embeds `/embed/<id>`,
  which plays after one tap (R9–R11).
- **S4.** Given a patch with a Freesound sample, when it is shared, then the recipient's Sample loads the same sound
  and renders identically. Given a local file instead, the recipient sees "sample missing" (R12–R14).

## v1 reference
- v1 `CommandHandlers/SaveCommandHandler.ts` and `SaveAsCommandHandler.ts`, `UI/SharePanel.ts`, `App.SessionId`
  (localStorage), `Core/Visual/AddressBarManager.ts`.
- v1 `UI/SoundcloudPanel.ts` and `Core/Audio/SoundCloud/SoundCloudAPI.ts` (MultiSearch, 510 s limit).
- Deviations:
  - Each save is a revision rather than an overwrite in place (owner decision, 2026-11-07).
  - Freesound replaces SoundCloud.
  - Embeds and oEmbed are new (SHARING-0002).

## Verification
- **`pnpm test:sharing`** (`tests/e2e/sharing.ts`): local Worker, Cloudflare test Turnstile key, and Freesound plus
  siteverify mocks.
  - `api-guards`: R1, R3–R6 (incl. R5a).
  - `share-and-load`: R2, R3, R4, R7, R9, R10, S1, S2.
  - `embed`: R10, R11, S3.
  - `samples`: R12–R15, S4.
  - `quick-save`: R18–R20 (and `pnpm test:ui-regressions` `quick-save-no-link-opens-save`, `quick-save-plugin-keys`).
  - `share-new-tab`: S1 with the owner's steps (blocks added from the menus, one moved, link opened in a new tab).
- **`pnpm test:ui-regressions`**: `sample-loop-region`, `sample-reverse-mirrors`, `sample-loading-indicator` and
  `convolver-downloads-only-what-it-uses` (R16, R17); engine `test_review_fixes.cpp` (reverse restarts voices).
- **`pnpm bd server smoke --env staging`**: the same suite against the deployed Worker, with real Turnstile and
  Freesound.
- **`pnpm bd ui diff`**: the `sample-search*` fixtures check the ported panel against v1 with mocked SoundCloud results
  (R15).

## Open questions
- Moving to blokdust.com, if it is recovered, is a config change (SHARING-0004).
