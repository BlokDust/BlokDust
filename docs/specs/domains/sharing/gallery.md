---
id: SPEC-SHARING-GALLERY
title: Gallery
status: draft
domain: sharing
adrs: [SHARING-0009, SHARING-0008, DATA-0005]
updated: 2026-11-15
---
# Gallery

## Purpose
A public gallery of patches people chose to publish (SHARING-0009), in the Patches panel's GALLERY tab: search,
popular or new, like, open, remix and report. Worker: `server/src/gallery.ts`; browser: `web/src/gallery/client.ts`.

## Requirements
- **R1.** PUBLISH THIS PATCH works only when signed in with a handle. It first saves the open patch to the account
  (a new link, or saved over its own), then publishes it.
- **R2.** Only the owner of a patch can publish it. Signed out: 401.
- **R3.** A patch that uses audio files from the user's device, or a Recorder, can't be published (DATA-0005). The
  error says why.
- **R4.** The title must pass the word check (server/src/moderation.ts) and not be empty.
- **R5.** Saving over a published patch updates its title and block types in the gallery. If the patch can no longer
  be published (R3, R4), it is withdrawn.
- **R6.** The owner's own rows offer UNPUBLISH. The link keeps working.
- **R7.** `GET /api/gallery?sort=popular|new&q=&page=` returns 20 a page; the tab shows 5 rows a page.
  - Each row: title, `by @handle`, remixes, likes, and whether you liked it.
  - `q` words match titles and block types; `@name` matches one person.
  - Popular = (likes + 2 × remixes + 1) ÷ (hours since published + 2).
  - Hidden patches are never listed.
- **R8.** LIKE needs sign-in and counts one per person. Pressing it again takes the like back. There are no down
  votes.
- **R9.** REPORT (asked first) needs sign-in and counts once per person. At three reports the patch is hidden.
- **R10.** `pnpm bd gallery reports|keep|hide|remove` lists reported or hidden patches with their reasons, and keeps
  (clears reports, shows), hides or removes one.
- **R11.** OPEN loads the patch as the current one. SAVE then makes a new link with `parent` set (a remix), which
  the original's row counts.
- **R12.** Deleting an account removes its gallery entries, likes and reports.
- **R13.** The tab is drawn with v1 pieces (SoundcloudPanel's search field, rule, bordered SEARCH and paged rows; the
  VIDEO tab's underlined cycling control for POPULAR / NEW; the OPEN tab's GUIDE button for PUBLISH). The plugin and
  embeds have no GALLERY tab.

## Verification
`pnpm test:gallery` covers R1–R12 (local Worker, mocked siteverify, virtual passkeys; R10 through the real tool on
the local D1).

## Open questions
- Thumbnails in rows; per-account rate limits; a moderator page.
