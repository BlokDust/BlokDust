---
id: CHG-0039
title: Sign-in methods, plugin gallery and plugin sign-in
status: done
date: 2026-11-19
specs: [SPEC-SHARING-ACCOUNTS, SPEC-SHARING-GALLERY]
adrs: [SHARING-0008, SHARING-0009, SHARING-0011]
---
# CHG-0039: Sign-in methods, plugin gallery and plugin sign-in

## Why
The owner wants the plugins (the DAW plugins, the standalone apps, the iPad app and its AUv3) to work with the
website seamlessly: what you make in the browser is there in the plugin, and what you save in the plugin joins your
collection. Today the plugins have no account and no gallery (SHARING-0008: "the plugin has no ACCOUNT tab yet"), and
an account reached by Google can't add Apple (or the other way round), so one person can end up with two accounts.
Owner, 2026-11-19: go ahead with all three.

## What changes
1. **Sign-in methods on the website** (SPEC-SHARING-ACCOUNTS R7a–R7c): SIGN-IN METHODS lists the ways in, adds
   Google, Apple or a passkey to the same account, and removes one (never the last). A Google or Apple account that
   belongs to another BlokDust account is refused while signed in (before: the session silently switched to it).
2. **Gallery in the plugins** (SPEC-SHARING-GALLERY): the GALLERY tab browses and opens patches in the plugins, from
   the public server (plugins have never called the API; it now allows their page's origin, no cookies).
3. **Plugin sign-in** (new ADR): a plugin's own revocable key, sent as `Authorization: Bearer`, never a cookie.
   - Desktop plugins and the standalone apps: a device code (RFC 8628 shape): the plugin shows a short code and opens
     the website (the AUv3, which can't open Safari, shows a QR code); you approve it there, signed in as usual.
   - The iPad app: Sign in with Apple and passkeys natively, then the same kind of key; its AUv3 shares it.
   - Signed in, OPEN lists the account's patches and SAVE saves to the account; ACCOUNT lists the signed-in apps,
     each removable. A key can't delete the account, change its sign-in methods or approve another device.

## Out of scope
- Merging two existing accounts.
- Google sign-in natively on the iPad (it goes through the code flow).

## Acceptance
- `pnpm test:accounts`: `link-and-remove-methods` (R7a–R7c), and the plugin key and device-code checks.
- `pnpm test:gallery` and ui-regressions for the plugin GALLERY tab and SIGN IN tab.
- `pnpm bd plugin test`, `bd plugin deploy`, `bd plugin ios device`; staging smoke.

## Risks and unknowns
- Sign in with Apple and passkeys in the iPad app need the App ID's Sign in with Apple capability and Associated
  Domains (webcredentials) with the site's `apple-app-site-association`; the Apple developer portal may need the
  owner (the Services ID grouped with the app's App ID so both give the same Apple user id).
