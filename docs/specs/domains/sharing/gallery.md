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
- **R6.** Switching ADD TO GALLERY off and saving takes the patch out (`DELETE /api/gallery/:id` too: the account, or
  the browser with the edit token). The link keeps working.
- **R7.** `GET /api/gallery?sort=popular|new|examples|tutorials&q=&page=` returns 20 a page (EXAMPLES and
  TUTORIALS: R16).
  - Each row: title, `by @handle`, remixes, likes, and whether you liked it.
  - `q` words match titles, block types and names; `@name` matches exactly one person.
  - Popular = (likes + 2 × remixes + 1) ÷ (hours since published + 2).
  - Hidden patches are never listed.
- **R7a.** The tab's rows are one list that scrolls (mouse wheel, or a drag, which never opens the row it started
  on) and fetches the next page as it nears its end, with v1's spinner where the next row will go (owner review 2:
  no pages of five).
- **R8.** Liking is the star after the credit on the stage (R15), with the patch open (owner review 2: not from the
  list). It needs sign-in (signed out, the star opens Settings › SIGN IN) and counts one per person; pressing it
  again takes the like back. There are no down votes. `GET /api/patches/:id` says `likes` and `liked`.
- **R9.** Reporting is a right-click on the credit (owner review 2: harder to do by accident), asked first on the
  GALLERY tab ("For a rude name or anything that should not be here.": it doesn't say how many reports hide a
  patch). It needs sign-in and counts once per person. At three reports the patch is hidden.
- **R10.** `pnpm bd gallery reports|keep|hide|remove` lists reported or hidden patches with their reasons, and keeps
  (clears reports, shows), hides or removes one.
- **R11.** OPEN loads the patch as the current one. While it is fetched the panel stays up with v1's spinner (owner
  review 3: the old stage could be changed meanwhile), then closes; if it can't be fetched, the panel says so. SAVE then makes a new link with `parent` set (a remix), which
  the original's row counts.
- **R12.** Deleting an account removes its gallery entries, likes and reports.
- **R13.** The tab is v1 SoundcloudPanel's layout: the search field (a plain text field, no clear button) over its
  rule at −110 units, SEARCH bordered above the rule at the right, the list (R7a), and POPULAR / NEW (underlined,
  POPULAR · NEW · EXAMPLES · TUTORIALS spread along the bottom (where v1 had its count and RANDOMISE), the chosen one
  underlined and remembered in this browser. Rows read `by @name · N remixes · N views` and have OPEN and INSERT (owner
  review 3: INSERT adds the patch's blocks to yours, as OPEN's INSERT, without asking and without a credit). The
  plugin and embeds have no GALLERY tab.
- **R14.** Opening a patch in the app (`GET /api/patches/:id`) counts a view, roughly (pages and previews don't).
- **R15.** Someone else's patch, opened from the gallery or a link, shows "TITLE BY @NAME" at the stage's top left
  (v1's mid type, under the panels), with a star after it when the patch is published (R8). Pressing @NAME opens
  the gallery searching `@name`. Saving it (a remix, or over a
  link of yours) removes the credit.
- **R16.** The site's own account, @blokdust (owner review 3, 2026-11-16), makes the EXAMPLES and TUTORIALS: its
  patches, oldest first. The built-in presets moved there from OPEN (the web OPEN lists only the user's own patches).
  Nobody can choose the name. `pnpm bd gallery presets` publishes the presets as its EXAMPLES (once each);
  `pnpm bd gallery official <name>` hands an account made for the purpose (its sign-ins and patches) to @blokdust,
  so the site owner signs in as @blokdust to add more; what @blokdust publishes goes in EXAMPLES, and
  `pnpm bd gallery kind <id> tutorial|example` moves one.

## Verification
`pnpm test:gallery` covers R1–R16 (local Worker, mocked siteverify, virtual passkeys; R10 through the real tool on
the local D1).

## Open questions
- Thumbnails in rows; per-account rate limits; a moderator page.
