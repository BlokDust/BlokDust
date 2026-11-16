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
A public gallery of patches people chose to publish (SHARING-0009): published with the ADD TO GALLERY switch when
saving, browsed in the Patches panel's GALLERY tab (search, popular or new, like, open, remix, report). Worker: `server/src/gallery.ts`; browser: `web/src/gallery/client.ts`.

## Requirements
- **R1.** Patches › SAVE / SHARE has an ADD TO GALLERY switch (v1's OptionSwitch), on by default. SAVE or SAVE AS
  sends it with the save (`gallery: true|false`), and the save's answer says whether the patch is published and, when
  it isn't, why (shown in place of the share warning). Published, there is no message (owner review 2026-11-15).
  Switching it on an already saved link makes SAVE available.
- **R2.** Only signed-in users with a name can publish (owner, 2026-11-15: accountability and ownership). Signed out,
  the switch is dimmed with the line "Only signed-in users can publish to the gallery.", SAVE leaves the gallery as it
  is, and a save asking to publish gets that reason back.
- **R3.** A patch that uses audio files from the user's device, or a Recorder, can't be published (DATA-0005). The
  error says why.
- **R4.** The title must pass the word check (server/src/moderation.ts) and not be empty.
- **R5.** Saving over a published patch updates its title and block types in the gallery. If the patch can no longer
  be published (R3, R4), it is withdrawn.
- **R6.** Switching ADD TO GALLERY off and saving takes the patch out; the owner's own gallery rows offer UNPUBLISH
  too (the account, or the browser with the edit token). The link keeps working.
- **R7.** `GET /api/gallery?sort=popular|new&q=&page=` returns 20 a page; the tab shows 5 rows a page.
  - Each row: title, `by @handle`, remixes, likes, and whether you liked it.
  - `q` words match titles, block types and names; `@name` matches exactly one person.
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
- **R13.** The tab is v1 SoundcloudPanel's layout: the search field (a plain text field, no clear button) over its
  rule at −110 units, SEARCH bordered above the rule at the right, five rows, the count bottom left and POPULAR / NEW
  (underlined, cycling) bottom right where v1 had RANDOMISE. Rows read `by @name · N remixes · N views`. The plugin and
  embeds have no GALLERY tab.
- **R14.** Opening a patch in the app (`GET /api/patches/:id`) counts a view, roughly (pages and previews don't).
- **R15.** Someone else's patch, opened from the gallery or a link, shows "TITLE BY @NAME" at the stage's top left
  (v1's mid type, under the panels). Pressing @NAME opens the gallery searching `@name`. Saving it (a remix, or over a
  link of yours) removes the credit.

## Verification
`pnpm test:gallery` covers R1–R15 (local Worker, mocked siteverify, virtual passkeys; R10 through the real tool on
the local D1).

## Open questions
- Thumbnails in rows; per-account rate limits; a moderator page.
