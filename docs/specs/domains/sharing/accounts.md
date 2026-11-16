---
id: SPEC-SHARING-ACCOUNTS
title: Accounts
status: draft
domain: sharing
adrs: [SHARING-0008, SHARING-0001, DATA-0005]
updated: 2026-11-15
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
  ids stay taken, so old links never open someone else's patch.
- **R11.** `GET /api/patches/:id` says `mine` when the signed-in account owns the patch, and `by` (the owner's
  handle) when it has one.

**Panel**
- **R12.** The plugin and embeds have no ACCOUNT tab.
- **R13.** Settings has a tab after ABOUT and DOWNLOAD (owner review 2026-11-15), named SIGN IN until someone is
  signed in, then ACCOUNT, drawn with v1 panel pieces (web/src/v1ui/accountPage.ts):
  - signed out: "Sign in to keep your patches on every device.", SIGN IN WITH PASSKEY · SIGN IN WITH GOOGLE, and a
    bordered CREATE ACCOUNT;
  - creating an account or naming one: a heading, a NAME field, the main button and BACK;
  - signed in: the name, ADD PASSKEY · SIGN OUT, and DELETE ACCOUNT (asked first).
  Signing in with a passkey closes Settings: back to the stage.
- **R13a.** Back from Google there is no start screen and no intro: the stage takes input at once and the first press
  or key starts the sound. A new account opens Settings at the name step; a known one stays on the stage.
- **R14.** Signed in, the stage's top right reads "SIGNED IN AS NAME" (v1's mid type, under the panels); pressing it
  opens Settings › ACCOUNT.

## Scenarios
- **S1.** Given a patch saved anonymously, when the user creates an account, then the patch is the account's (R1, R9).
- **S2.** Given a passkey synced to a second device, when the user signs in there, opens the patch from OPEN, changes
  it and presses SAVE, then the same link gets revision 2 (R2, R8, R9).

## Verification
`pnpm test:accounts` covers R1–R10 and R13–R14: a local Worker, mocked siteverify and Google, and Chrome's virtual WebAuthn
authenticator (the passkey is copied to a second context to stand in for sync).

## Open questions
- Apple sign-in, for the iPad app.
- Sign-in from the plugin (OAuth device flow).
