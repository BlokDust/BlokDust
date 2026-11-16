---
id: SHARING-0008
title: Optional accounts with passkeys and Google, sessions in D1
status: proposed
date: 2026-11-15
domain: sharing
tags: [sharing, accounts, security, cost]
supersedes: [SCOPE-0003]
superseded_by:
---
# SHARING-0008: Optional accounts with passkeys and Google, sessions in D1

## Context
The owner wants optional logins (2026-11-15): a user's saves follow them to any device, a handle shows on what they
publish (the gallery, next), and the owner gains hands-on authentication experience. SCOPE-0003 deferred accounts at
launch, and SHARING-0001 made saving anonymous with an edit token kept in the browser. Constraints: the Cloudflare free
tier, no passwords to store, only trusted and well maintained libraries, and AGPL-compatible licences.

## Decision
- **Accounts are optional.** Saving and sharing without signing in work as before.
- **No passwords and no email addresses.** Users sign in with:
  - a **passkey** (WebAuthn), using `@simplewebauthn/server` and `@simplewebauthn/browser` (MIT, widely used). The
    credentials are discoverable, so signing in needs no name. New accounts pass the Turnstile bot check.
  - **Google** (OpenID Connect authorisation code flow with PKCE S256), using `arctic` (MIT) with Google's endpoints.
    Only Google's stable subject id is kept. The ID token comes straight from Google's token endpoint over TLS, so the
    Worker checks its issuer, audience and expiry but not its signature (OIDC Core 3.1.3.7).
  - Apple is left for the iPad app, where App Store rules require Sign in with Apple.
- **Sessions are server-side.**
  - The token is 32 random bytes in an HttpOnly, SameSite=Lax cookie, with `__Host-` and Secure on https. D1 keeps
    only its SHA-256.
  - A session lasts 30 days and slides forward once half used.
  - Signing out deletes the row; signing out everywhere deletes all of the user's sessions.
  - These are not JWTs, so a session can always be revoked.
- **Changes need our Origin.** Every cookie-authenticated request that changes something must carry this site's
  `Origin`, on top of SameSite (CSRF defence).
- **Handles** are 3–20 of `a-z 0-9 _`, unique, checked against a reserved list and a small word check
  (server/src/moderation.ts).
- **Patches** get an `owner_id`.
  - Signing in claims the patches this browser holds edit tokens for (each token's hash is checked).
  - The owner can save over their patches from any device without the token.
  - Deleting an account deletes its patches.
- **D1 limits:** at most 90 patches are claimed per request, in one select and one batch, because D1 allows few
  queries and 100 bound values per request.

## Consequences
- New tables: `users`, `credentials`, `identities`, `sessions`, `challenges`, and `patches.owner_id` (migration
  0002). They fit easily in the free tier.
- Google sign-in needs an OAuth client from Google Cloud Console. `GOOGLE_CLIENT_ID` is a var; `GOOGLE_CLIENT_SECRET`
  is a Worker secret. Without them, only passkeys are offered.
- Personal data is minimal (a handle, a Google subject id, public keys). Account deletion is self-service.
- The plugin has no ACCOUNT tab yet (a device-code flow could add it later).

## Alternatives considered
- **Passwords**: storage, reset flows by email, breach risk; no.
- **Magic links by email**: needs email sending and storing addresses; no.
- **Hosted auth (Clerk, Auth0)**: costs at scale, and teaches the owner less; no.
- **JWT sessions**: cannot be revoked before they expire; no.
