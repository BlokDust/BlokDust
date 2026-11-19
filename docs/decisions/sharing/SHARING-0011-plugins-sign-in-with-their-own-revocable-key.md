---
id: SHARING-0011
title: Plugins sign in with their own revocable key, approved on the website or by Apple and passkeys on iPad
status: accepted
date: 2026-11-19
domain: sharing
tags: [sharing, accounts, plugin, ipad, security]
supersedes: []
superseded_by:
---
# SHARING-0011: Plugins sign in with their own revocable key, approved on the website or by Apple and passkeys on iPad

## Context
The owner wants the plugins (DAW plugins, standalone apps, the iPad app and its AUv3) to share the website's accounts:
patches made in the browser open in the plugin, and saving in the plugin adds to the account (2026-11-19). SHARING-0008
left the plugin without an ACCOUNT tab. The website's sign-in can't simply run there: a passkey is bound to the
site's domain and the plugin's page is `juce://juce.backend`; Google refuses embedded web views; the site's session
cookie belongs to the site. Inside a DAW, Apple's native sign-in and app passkeys belong to the host app (Logic,
Ableton), not to BlokDust; in the iPad app they are BlokDust's own.

## Decision
- **A plugin key per signed-in plugin.** 32 random bytes, sent as `Authorization: Bearer bdk_…` (the prefix keeps it
  apart from a patch's edit token). D1 keeps only its SHA-256 (`app_keys`), with a name ("BlokDust on Mac"), when it was
  made and last used; it lasts 180 days from its last use. It is never a cookie, so no CSRF: the API allows the
  plugins' origins only and never with credentials (CHG-0039).
- **What a key can do** (endpoints opt in): read the account (`/api/me`, its patches, stats), save and open patches,
  like and report, set the name, send activity, sign itself out. Never: delete the account, add or remove sign-in
  methods, approve another device, list or revoke other keys. Those need the website's own session.
- **Desktop plugins and standalone apps: a device code** (RFC 8628's shape). The plugin asks for a code
  (`POST /api/device/start`), shows it (`XXXX-XXXX`, no vowels, no 0/O/1/I), opens the website at it (the AUv3 can't
  open Safari: a QR code), and asks every 5 seconds (`/api/device/poll`, faster is refused). Signed in on the website,
  the person sees which device asks and presses APPROVE (or CANCEL); the next poll takes the key, once. Codes last 10
  minutes; only hashes of both codes are kept; starting is rate limited.
- **The iPad app: Sign in with Apple and passkeys natively**, then the same kind of key. Apple's answer is checked by
  exchanging its code at Apple with the app's id as client (as the website does with its Services ID, which is grouped
  with the app's App ID so both give the same Apple user), with a one-time nonce the server issued. Passkeys use the
  site's domain through Associated Domains (`webcredentials`) and the site's `apple-app-site-association`. Google on
  the iPad goes through the device code.
- **Where the key lives:** a file only the user can read: `~/Library/Application Support/BlokDust/account.json` on macOS
  (one for every DAW and the app; the login keychain would ask each DAW for access), `%APPDATA%\BlokDust` on Windows,
  and the App Group container on iPad (shared by the app and its AUv3, inside the iOS sandbox and data protection).
- **Saving with a key needs no bot check** (the account passed it when made); the save rate limits still apply.

## Consequences
- New tables `app_keys`, `device_codes` (migration 0010); new endpoints under `/api/device/` and `/api/me/apps`;
  `currentUser` reads a key only where an endpoint allows it.
- The website's ACCOUNT lists the plugins signed in, each removable; a plugin's SIGN OUT deletes its key.
- The iPad app needs the Sign in with Apple and Associated Domains capabilities on its App ID.

## Alternatives considered
- **The site's cookie in the plugin's web view**: cookies of `blokdust.funputs.com` aren't the plugin page's, and a
  third-party cookie would need credentials in CORS for every origin that can load the page; no.
- **OAuth with a loopback redirect**: needs a local web server in a DAW plugin; the device code needs none.
- **The keychain everywhere**: on macOS each DAW would be asked for access to the item; files with user-only access
  are used instead (the iPad's sandbox does the same job).
