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
- **R7.** `GET /api/gallery?sort=popular|top|new|examples|tutorials&q=&page=` returns 20 a page (EXAMPLES and
  TUTORIALS: R16). TOP (all time, CHG-0035) orders by likes + 2·remixes with no decay, newest first among equals.
  - Each row: title, `by @handle`, remixes, likes, and whether you liked it.
  - `q` words match titles, block types and names; `@name` matches exactly one person.
  - Popular = (likes + 2 × remixes + 1) ÷ (hours since published + 2).
  - Hidden patches are never listed.
- **R7a.** The tab's rows are one list that scrolls (mouse wheel, or a drag, which never opens the row it started
  on) and fetches the next page as it nears its end, with v1's spinner where the next row will go (owner review 2:
  no pages of five).
- **R8.** Likes (owner review 3, 2026-11-16: an up chevron, the first peak of v1's triangle-wave icon, in place of
  the star; the owner chose direction B of three). On the stage, a second line under the credit: the chevron, the
  count, the views. In the gallery, a column left of each row: the chevron over the count. Either chevron likes (the
  owner changed their mind about the list); signed out, it opens Settings › SIGN IN. One per person; pressing again
  takes the like back; no down votes. The wish shows at once on both; one request per patch at a time, then another
  only if the wish changed, so fast presses settle on the last (no flicker, at most two requests). `GET
  /api/patches/:id` says `likes` and `liked`.
- **R9.** Reporting is Settings › FEEDBACK › REPORT A PATCH (CHG-0041, owner 2026-11-19: the right-click on the
  credit nobody would find is gone), for the gallery patch on the stage that isn't yours, with an optional reason (it
  doesn't say how many reports hide a patch). It needs sign-in and counts once per person. At five reports the patch is hidden (three until the PR 13
  security review: throwaway accounts are cheap). @blokdust's own patches (EXAMPLES, TUTORIALS) are never hidden by
  reports; their reports are kept for R10.
- **R10.** `pnpm bd gallery reports|keep|hide|remove` lists reported or hidden patches with their reasons, and keeps
  (clears reports, shows), hides or removes one.
- **R11.** OPEN loads the patch as the current one. While it is fetched the panel stays up with v1's spinner (owner
  review 3: the old stage could be changed meanwhile), then closes; if it can't be fetched, the panel says so. SAVE then makes a new link with `parent` set (a remix), which
  the original's row counts.
- **R12.** Deleting an account removes its gallery entries, likes and reports.
- **R13.** The tab is v1 SoundcloudPanel's layout: the search field (a plain text field, no clear button) over its
  rule at −110 units, SEARCH bordered above the rule at the right, the list (R7a), and POPULAR / NEW (underlined,
  POPULAR · ALL TIME TOP · NEW · EXAMPLES spread along the bottom (where v1 had its count and RANDOMISE; no TUTORIALS
  button while there are none, owner 2026-11-17), the chosen one underlined and remembered in this browser. The list's
  window holds whole rows and a half (more below shows), rows go under the search rule as they scroll, the last row
  ends 10 units above the window's foot, and with more to fetch the row after the last reads SHOW MORE (a spinner while
  they come; scrolling near the end fetches them too). OPEN's list is laid out the same way (CHG-0035). Rows read `by @name · N remixes · N views` and have OPEN and INSERT (owner
  review 3: INSERT adds the patch's blocks to yours, as OPEN's INSERT, without asking and without a credit). The
  plugins have GALLERY too (CHG-0039): their page reaches the public site (`web/src/patch/site.ts`; the API allows the
  plugins' origins `juce://juce.backend` and `https://juce.backend`, never with credentials), and a patch opened there
  goes to the processor, which the DAW project keeps. Embeds have no GALLERY tab.
- **R14.** Opening a patch in the app (`GET /api/patches/:id`) counts a view, roughly (pages and previews don't).
- **R15.** Someone else's patch, opened from the gallery or a link, shows "TITLE BY @NAME" at the stage's top left
  (the 8-unit size of About's build line, in capitals, owner review 3), with the like control when it is published (R8).
  @NAME (and SIGNED IN AS, top right) is underlined only under the mouse. Pressing @NAME opens
  the gallery searching `@name`. Saving it (a remix, or over a
  link of yours) removes the credit.
- **R16.** The site's own account, @blokdust (owner review 3, 2026-11-16), makes the EXAMPLES and TUTORIALS: its
  patches, oldest first. The built-in presets moved there from OPEN (the web OPEN lists only the user's own patches).
  Nobody can choose the name. `pnpm bd gallery presets` publishes the presets as its EXAMPLES (once each);
  `pnpm bd gallery official <name>` hands an account made for the purpose (its sign-ins and patches) to @blokdust,
  so the site owner signs in as @blokdust to add more; what @blokdust publishes goes in EXAMPLES, and
  `pnpm bd gallery kind <id> tutorial|example` moves one.

- **R17.** *(CHG-0041, owner 2026-11-19)* Someone else's patch on the website (opened from a link or the gallery and
  neither this browser's nor the signed-in account's; and every embed) is guarded until you save it as yours: its
  microphone stays off and v1's message bar says "This patch uses your microphone." with TURN ON (a Microphone you put
  down yourself opens it at once), and its sound goes through a safety limit after the engine (a slow compressor:
  threshold −24 dB, ratio 4, 0.25 s attack, 1.5 s release; then a limiter: −3 dB, ratio 20). Your own patches,
  files, presets and the plugins are neither. On the website a patch's Audio In loads as a Microphone, which needs
  power (the plugins keep Audio In: the DAW track, no power).
## Verification
`pnpm test:gallery` covers R1–R16 (local Worker, mocked siteverify, virtual passkeys; R10 through the real tool on
the local D1).

## Open questions
- Thumbnails in rows; per-account rate limits; a moderator page.
