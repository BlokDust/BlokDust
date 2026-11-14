---
id: SPEC-PROCESS-PRIVATE-OPERATIONAL-CONFIGURATION
title: Private operational configuration
status: active
domain: process
adrs: [PROCESS-0005]
updated: 2026-11-11
---
# Private operational configuration

## Purpose
Keep local agents able to operate deployed services and test machines without publishing personal infrastructure.

## Requirements
- **R1.** Host configuration MUST live outside checkouts in `~/.config/blokdust/config.env`; private instructions MUST live beside it in `LOCAL.md`. The committed example MUST contain names and safe placeholders only.
- **R2.** Tools MUST parse dotenv without shell evaluation, prefer the process environment, reject a configuration directory inside the checkout, and name missing settings without printing values. Public builds and mock tests MUST work without private configuration.
- **R3.** Signing, notarization and deployment MUST retain credentials in Keychain, SSH or existing external credential files. Private configuration MUST NOT be imported into the frontend.
- **R4.** Remote Worker commands MUST generate account-specific Wrangler configuration outside the checkout, preserve absolute entrypoint/assets/migration paths, and save setup results outside tracked files. Local/mock Worker commands MUST use only test settings.
- **R5.** Privacy checks MUST report locations and categories without matched values, scan reachable history before publication, and detect private hosts, personal paths, emails and signing identities. Raw machine reports MUST remain ignored. Public project credits and required notices remain intact.

## Scenarios
- **S1.** A local agent reads the private notes and runs the existing deploy/sign/test commands using external settings (R1–R3).
- **S2.** A public clone has no local configuration; mock tests and normal builds work, while deploy fails with a missing variable name (R2, R4).
- **S3.** Setup discovers a database identifier; only private settings change, with no tracked diff (R4).
- **S4.** Private data is added to source or reachable history; the privacy check fails without echoing it (R5).

## Verification
`pnpm bd privacy selftest` tests loader isolation, environment precedence, dotenv injection resistance, missing settings,
private remote-config permissions/paths and redacted leak detection. `pnpm bd privacy check` checks tracked files;
`pnpm bd privacy history` checks all reachable Git objects and commit metadata. Existing sharing tests prove local
Worker behavior. Deployment dry-run validates the generated config without publishing.

## v1 reference
Operational tooling only; no v1 product behavior changes.
