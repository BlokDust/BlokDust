---
id: CHG-0023
title: Optional accounts
status: proposed
date: 2026-11-15
specs: [SPEC-SHARING-ACCOUNTS, SPEC-SHARING-BACKEND]
adrs: [SHARING-0008]
---
# CHG-0023: Optional accounts

## Why
Owner, 2026-11-15, second of video export, user login and the gallery: saves on any device, a handle for the gallery,
and hands-on authentication experience. No passwords, nothing paid, only trusted and well maintained libraries.

## What changes
- D1 migration 0002: users, passkeys, Google identities, sessions, challenges, and `patches.owner_id`.
- Worker: passkey sign-up and sign-in (SimpleWebAuthn), Google OIDC with PKCE (Arctic), sessions, `/api/me…`, handle
  rules and a small word check, claiming patches, and owners saving over their patches from any device
  (SPEC-SHARING-ACCOUNTS R1–R11).
- Web: `web/src/account/client.ts`, the Patches › ACCOUNT tab (R13), the account's patches in OPEN (R8).

## Out of scope
- Plugin sign-in, Apple sign-in, email of any kind.

## Acceptance
- `pnpm test:accounts` passes (20 checks).
- `pnpm test:sharing`, `pnpm test:ui-regressions` and `pnpm test:video` still pass.
- Owner: create an account with a passkey on a phone and sign in on a laptop; sign in with Google on staging, once
  the Google OAuth client exists.

## Before staging
- The owner creates a Google OAuth client (Google Cloud Console, Web application) with the redirect URIs
  `https://<staging host>/api/auth/google/callback` and the production one. `GOOGLE_CLIENT_ID` goes in
  wrangler.jsonc vars, and the secret goes in with `pnpm bd server secret`.
- Migration 0002 is applied to the staging D1 (`wrangler d1 migrations apply --remote`).

## Risks and unknowns
- Passkey UX varies by platform (Windows Hello, Android, iCloud Keychain); check on real devices.

## Owner review 1 (2026-11-15)
- The account is in Settings (SIGN IN until signed in, then ACCOUNT), not Patches.
- No SIGN OUT EVERYWHERE button, no "New here?", no rule under the line, shorter line.
- Back from Google: no start screen or intro; a new account names itself in Settings, a known one stays on the stage.
- Signing in with a passkey returns to the stage, which says SIGNED IN AS NAME at the top right.
- Fix found on the way: the corner text crashed the first frame before v1's fonts were set (caught by test:video).
