---
id: SPEC-SHARING-ACCOUNTS
title: Accounts
status: draft
domain: sharing
adrs: [SHARING-0008, SHARING-0001, DATA-0005]
updated: 2026-11-16
---
# Accounts

## Purpose
Optional accounts (SHARING-0008), so a user's patches follow them to any device and carry their handle. Saving and
sharing keep working without an account. The Worker side is `server/src/auth/`; the browser side is
`web/src/account/client.ts` and Patches › ACCOUNT.

## Requirements
**Signing up and in**
- **R1.** CREATE ACCOUNT takes a handle (R6) and a Turnstile token, then the device makes a discoverable passkey
  (WebAuthn: resident key required, user verification preferred, no attestation). The account is created only once
  the passkey has been verified, and is then signed in.
- **R2.** SIGN IN WITH PASSKEY needs no name: the device offers its passkeys for this site. The server checks the
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
- **R7.** ADD PASSKEY adds another passkey to the signed-in account.
- **R8.** `GET /api/me/patches` lists the account's patches, newest first. The OPEN tab lists them first ("Your
  account · Saved …").
- **R9.** A patch saved while signed in belongs to the account. Signing in claims the patches this browser holds edit
  tokens for. The owner can save over the account's patches from any device signed in to it, without the edit token.
- **R10.** DELETE ACCOUNT (asked first) deletes the account, its passkeys, Google link, sessions and patches. Their
  ids stay taken, so old links never open someone else's patch. Their likes come off only the patches they liked.
  Per-IP limited, like sign-in.
- **R11.** `GET /api/patches/:id` says `mine` when the signed-in account owns the patch, and `by` (the owner's
  handle) when it has one.

**Panel**
- **R12.** The plugin and embeds have no ACCOUNT tab.
- **R13.** Settings has a tab after ABOUT and DOWNLOAD (owner review 2026-11-15), named SIGN IN until someone is
  signed in, then ACCOUNT, drawn with v1 panel pieces (web/src/v1ui/accountPage.ts):
  - signed out: "Sign in to keep your patches on every device.", then one full-width button each for GOOGLE, APPLE
    and PASSKEY, in that order (owner review 2), and a bordered CREATE ACCOUNT;
  - creating an account or naming one: a small heading in the tab type with no rule and no explanation (owner review
    2: the large heading over a rule read as a text field), a NAME field, the main button and BACK;
  - signed in: "SIGNED IN AS NAME" on one line in the tab type, no rule (owner review 2), DELETE ACCOUNT (asked
    first) at the right of that line (CHG-0027), the stats (R15, R16), then ADD PASSKEY · SIGN OUT.
  Signing in with a passkey closes Settings: back to the stage.
- **R13a.** Back from Google or Apple there is no start screen and no intro: the stage takes input at once and the first press
  or key starts the sound. A new account opens Settings at the name step; a known one stays on the stage.
- **R15.** (CHG-0027) Signed in, ACCOUNT shows the account's stats between SIGNED IN AS NAME and ADD PASSKEY · SIGN
  OUT, all in the one `GET /api/me?stats=1` the tab already makes (loading the page asks `/api/me` without them):
  - "since MONTH YEAR" (the account's creation) after SIGNED IN AS NAME, in v1's italic (left out when a long name
    leaves no room before DELETE ACCOUNT);
  - PATCHES (the account's), REMIXES (its patches made from someone else's: `parent` owned by another or nobody),
    LIKES (on its gallery patches) and PLAYS (its patches opened in the app, by anyone; owner, 2026-11-16: was OPENS), each a number in the Settings sliders'
    light type over a mid-type label; numbers past 9,999 are short (12.3K, 1.2M);
  - FAVOURITE BLOCKS: up to five block types, in the most of the account's patches first, then the most of them,
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
`pnpm test:accounts` covers R1–R10 and R13–R16: a local Worker, mocked siteverify, Google and Apple (its client secret
checked against the run's key), and Chrome's virtual WebAuthn
authenticator (the passkey is copied to a second context to stand in for sync).

## Open questions
- Apple sign-in, for the iPad app.
- Sign-in from the plugin (OAuth device flow).
