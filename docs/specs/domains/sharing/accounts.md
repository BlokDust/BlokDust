---
id: SPEC-SHARING-ACCOUNTS
title: Accounts
status: draft
domain: sharing
adrs: [SHARING-0008, SHARING-0001, DATA-0005]
updated: 2026-11-17
---
# Accounts

## Purpose
Optional accounts (SHARING-0008), so a user's patches follow them to any device and carry their handle. Saving and
sharing keep working without an account. The Worker side is `server/src/auth/`; the browser side is
`web/src/account/client.ts` and Patches › ACCOUNT.

## Requirements
**Signing up and in**
- **R1.** CONTINUE WITH PASSKEY first signs in (R2). When no passkey is chosen (the browser does not say whether the
  user had none or closed the dialog) or the passkey is not known here, it asks for a handle (R6) instead, with BACK;
  CREATE WITH PASSKEY then sends it with a Turnstile token, and the device makes a discoverable passkey (WebAuthn:
  resident key required, user verification preferred, no attestation). The account is created only once the passkey
  has been verified, and is then signed in.
- **R1b.** (CHG-0035) A network makes at most `ACCOUNTS_PER_DAY` new accounts a UTC day (default 10: a school class
  shares one address), counted once an account exists, by passkey, Google or Apple. Over it, a new passkey account is
  refused (429, saying why) before the device makes a passkey, and a new Google or Apple account is not made: the app
  comes back with `?account=limit` and Settings › SIGN IN says why. Known accounts still sign in, and signed-in
  accounts still add Google, Apple or passkeys. The count is kept under a hash of the address with the day's random
  salt, and a day's counts are deleted the next day.
- **R2.** Signing in with a passkey needs no name: the device offers its passkeys for this site. The server checks the
  challenge (one use, 5 minutes), origin, RP ID and signature counter.
- **R2a.** SIGN IN WITH GOOGLE uses the authorisation code flow with PKCE S256 and a state check, and keeps only
  Google's subject id. If that Google account is new here, a new account is made and the user then picks a handle
  (R6). If the user is already signed in, Google is added to their account. Shown only when Google is configured.
  The page to return to afterwards (Google and Apple) is a path on this site only, checked as the URL parser reads it
  (tabs and newlines dropped, `\` as `/`), so it can never send the user to another site.
- **R2b.** SIGN IN WITH APPLE (owner review 2, 2026-11-15) is the same flow without PKCE: no scopes (no name or email),
  so Apple answers by redirect (`response_mode=query`); the client secret is an ES256 JWT signed with the Sign in with
  Apple key (`APPLE_PRIVATE_KEY`, a Worker secret; `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` vars). Only
  Apple's subject id is kept. Shown only when Apple is configured.

**Sessions**
- **R3.** A session is a 32-byte random token in an HttpOnly, SameSite=Lax cookie (`__Host-` and Secure on https).
  Only the token's SHA-256 is stored. It lasts 30 days and slides forward once half used.
- **R4.** SIGN OUT ends this session. `POST /api/auth/logout {everywhere: true}` ends all of the account's sessions (no
  button: owner review 2026-11-15).
- **R5.** Every cookie-authenticated request that changes something (POST, PUT, DELETE under `/api/auth/` and
  `/api/me`, and saving over an owned patch) MUST carry this site's `Origin`, or it gets 403.

**The account**
- **R6.** A handle is 3–20 of `a-z 0-9 _`, unique ignoring case. It is not reserved (admin, blokdust, …) and
  contains no blocked word. The word check (server/src/moderation.ts) folds look-alike characters, and refuses short
  roots only as whole words, so names like grape or Scunthorpe stay allowed.
- **R7.** ADD PASSKEY (ADD ANOTHER PASSKEY once the account has one) adds a passkey on this device to the signed-in
  account, beside its Google, Apple and other passkeys. No message: its row in SIGN-IN METHODS shows it (R7a).
- **R7a.** *(CHG-0039, owner 2026-11-19)* Signed in, ACCOUNT's SIGN-IN METHODS lists every way into the account
  (`GET /api/me` → `methods`: Google, Apple, then each passkey, with when it was added) and adds one: ADD GOOGLE and
  ADD APPLE (where the server offers them and the account hasn't got them) go to Google or Apple and back, and that
  account joins this one ("Google added."); ADD PASSKEY as R7. A Google or Apple account joins only while signed in
  and on purpose; accounts are never merged by matching emails (none are kept).
- **R7b.** A Google or Apple account that already belongs to another BlokDust account is refused while signed in
  ("That Google account is already used by another BlokDust account…"): nothing is added, the session stays as it
  was (it never switches accounts behind the user's back). Back from the provider the page reads `?account=`
  `linked-<provider>` or `taken-<provider>`.
- **R7c.** REMOVE (beside each way in, while there is more than one) takes it off the account:
  `DELETE /api/me/methods {kind, id?}` (this site's Origin, R5). The last way in is never removed (409); the count and
  the delete are one statement, so two removals at once can't leave none.

- **R8.** `GET /api/me/patches` lists the account's patches, newest first. The OPEN tab lists them first ("Saved …":
  every patch there is the user's, so no "Your account"; owner, 2026-11-18), once each: this browser's own copies are
  listed after them only when they aren't the account's (a copy remembers its link; older copies are matched by name).
- **R8a.** *(CHG-0037)* Each account patch in OPEN has a bin. Deleting asks first ("Anyone with the link will no
  longer be able to open this save. If it's published, it will also be removed from the gallery.") and really deletes it (SPEC-SHARING-BACKEND R4,
  R4b): it leaves the gallery, its link answers 410, and if it is on the stage the stage keeps it, unlinked (SAVE makes
  a new link). Unpublish is the way to leave the gallery and keep the link.
- **R9.** A patch saved while signed in belongs to the account. Signing in claims the patches this browser holds edit
  tokens for. The owner can save over the account's patches from any device signed in to it, without the edit token.
- **R10.** DELETE ACCOUNT (asked first: "This will permanently delete your account and all patches. Shared links to
  your patches will stop working."; closing Settings is CANCEL) deletes the account, its passkeys, Google link, sessions and patches. Their
  ids stay taken, so old links never open someone else's patch. Their likes come off only the patches they liked.
  Per-IP limited, like sign-in.
- **R11.** `GET /api/patches/:id` says `mine` when the signed-in account owns the patch, and `by` (the owner's
  handle) when it has one.

**Panel**
- **R12.** The plugin and embeds have no ACCOUNT tab.
- **R13.** Settings has a tab after ABOUT and DOWNLOAD (owner review 2026-11-15), named SIGN IN until someone is
  signed in, then ACCOUNT, drawn with v1 panel pieces (web/src/v1ui/accountPage.ts):
  - signed out: "Sign in to keep your patches on every device.", then one full-width button each for GOOGLE, APPLE
    and CONTINUE WITH PASSKEY, in that order (owner review 2; one passkey button, R1: owner, 2026-11-17);
  - creating an account or naming one: a small heading in the tab type with no rule and no explanation (owner review
    2: the large heading over a rule read as a text field), a NAME field, the main button and BACK;
  - signed in: STATS in the tab type, no rule (the stage's corner already says who: owner, 2026-11-18), the page
    35 units higher than the other tabs' pages, the stats (R15, R16), then SIGN-IN METHODS · SIGN OUT (R7a), and under them
    "Sign-in methods: Google · Apple · 2 passkeys" (the ones it has; CHG-0035); DELETE ACCOUNT (asked first) at the bottom right of
    the screen, out of the way (owner, 2026-11-18).
  Signing in with a passkey closes Settings: back to the stage.
- **R13a.** Back from Google or Apple there is no start screen and no intro: the stage takes input at once and the first press
  or key starts the sound. A new account opens Settings at the name step; a known one stays on the stage.
- **R15.** (CHG-0027) Signed in, ACCOUNT shows the account's stats between STATS and SIGN-IN METHODS · SIGN
  OUT, all in the one `GET /api/me?stats=1` the tab already makes (loading the page asks `/api/me` without them):
  - PATCHES (the account's), REMIXES (its patches made from someone else's: `parent` owned by another or nobody),
    LIKES (on its gallery patches) and PLAYS (its patches opened in the app, by anyone; owner, 2026-11-16: was OPENS), each a number in the Settings sliders'
    light type over a mid-type label; numbers past 9,999 are short (12.3K, 1.2M);
  - on a phone (CHG-0037): the two rows of four numbers, FAVOURITE BLOCKS in two rows of three (six), the most remixed
    line under its title, more room between the parts;
  - FAVOURITE BLOCKS: up to five block types (the server sends six), in the most of the account's patches first, then the most of them,
    each v1's menu icon over its menu name (two lines when wider than its column); or a line saying to save a patch;
  - "Most remixed: TITLE, N times" at the right of the FAVOURITE BLOCKS line, when others have made patches from one
    of the account's.
  The block tally is kept per patch (`patches.blocks`, "type:n" pairs) on every save, so the stats never read patch
  JSON; patches saved before it are counted, 25 at a time, when their owner next opens the tab.
- **R16.** (CHG-0027) Under the first row of numbers, a second: MINUTES PLAYED (HOURS PLAYED from an hour, one
  decimal under ten), BLOCKS ADDED, PARTICLES and LASER TURNS. They are for fun, not exact (owner, 2026-11-16: few
  requests matter more than accuracy), and only their owner sees them:
  - the website counts them (not the plugin or embeds): time while the page is shown and the sound started; each
    block added (menu, paste, duplicate, insert: what undo removes); every particle the engine emits, however it was
    fired (powered, pressed, hit by a laser, played from keys or MIDI; owner, 2026-11-16: the snapshot carries the
    count of Emit events); laser turns estimated from each Laser's params (|Rotate| / 100 × 60 / 360 turns a second
    while powered, or one per Turn Beats synced; nothing with POWER off);
  - what isn't sent waits in localStorage (shared by the site's tabs) and is shown on top of the account's totals;
  - it goes with every save (`activity` in the body; added only when signed in, and the reply says so), and, when
    the page closes signed in, in one `POST /api/me/activity` (keepalive). The server clamps each request (a day
    of play, 10,000 blocks, 10 million particles, a million turns) and keeps the totals on `users`;
  - `ACTIVITY_BEACON=off` (a var, or a Worker secret to flip it without a deploy) turns that request off, in case
    D1's free writes run short: `/api/config` says `activityBeacon: false`, the page stops sending it, and the
    endpoint writes nothing. Saves still carry the totals.
- **R14.** Signed in, the stage's top right reads "SIGNED IN AS NAME" (v1's mid type, under the panels); pressing it
  opens Settings › ACCOUNT.

## Scenarios
- **S1.** Given a patch saved anonymously, when the user creates an account, then the patch is the account's (R1, R9).
- **S2.** Given a passkey synced to a second device, when the user signs in there, opens the patch from OPEN, changes
  it and presses SAVE, then the same link gets revision 2 (R2, R8, R9).

## Verification
`pnpm test:accounts` covers R1–R10 (R1b on a second local Worker allowing 2 a day) and R13–R16: a local Worker, mocked siteverify, Google and Apple (its client secret
checked against the run's key), and Chrome's virtual WebAuthn
authenticator (the passkey is copied to a second context to stand in for sync).

## Open questions
- Apple sign-in, for the iPad app.
- Sign-in from the plugin (OAuth device flow).
