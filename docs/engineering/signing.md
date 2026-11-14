# Signing and notarisation (macOS)

`pnpm bd plugin sign` builds both plugins, signs all five bundles (BlokDust × VST3 / AU / Standalone, BlokDust FX × VST3 / AU; FX has no Standalone since CHG-0010)
with the **Developer ID Application** certificate and the hardened runtime, verifies them, then notarises with Apple,
staples the tickets and runs Gatekeeper's check on the apps. The result is `build/plugin/dist/BlokDust-macOS.zip`.

## One-time setup

1. Install your Developer ID Application and Installer certificates and their private keys in macOS Keychain.
2. Set `BLOKDUST_SIGNING_IDENTITY`, `BLOKDUST_INSTALLER_IDENTITY`, `BLOKDUST_APPLE_TEAM_ID` and
   `BLOKDUST_NOTARY_PROFILE` in the external configuration described in [local configuration](local-configuration.md).
3. Store notarization credentials once in Keychain, from an interactive terminal:

   ```bash
   xcrun notarytool store-credentials <profile> \
       --apple-id <apple-id> --team-id <team-id> --password <app-specific-password>
   ```

Use the values from private configuration. Keep passwords in Keychain, and record machine-specific setup status
in the external `LOCAL.md`. `bd plugin sign` and `bd plugin package` use the configured identities and profile.

## Release installers (CHG-0005 task 12, PLUGIN-0005)

- `pnpm bd plugin package`: the `plugin-release` preset (universal arm64 + x86_64, macOS 11+), all five bundles signed,
  then `BlokDust-<version>-Mac.pkg` (VST3 → /Library/Audio/Plug-Ins/VST3, AU → …/Components, apps → /Applications,
  licences → /Library/Application Support/BlokDust) signed with **Developer ID Installer**, notarised, stapled and
  assessed by Gatekeeper, with a `.sha256`. It checks every binary's architectures, `minos 11.0` and version first.
  Without the notary profile it stops (exit 2) and prints the command above.
- `pnpm bd win package`: the Windows installer, unsigned for Release 1 (see below).
- `pnpm bd release check | publish [--dry-run]`: uploads both to downloads.funputs.com/releases/blokdust/<version>/.
- The version is the root `package.json`'s; CMake reads it, so the plugins, About's "Current Build" and the installers
  agree.

## Notes

- Hardened runtime entitlements come from JUCE (`HARDENED_RUNTIME_OPTIONS` in `plugin/CMakeLists.txt`): audio input
  for Audio In in the Standalone, with a microphone usage string.
- Without a stored profile the tool still signs and verifies, and reports notarisation as `skipped` with the command
  above. Unnotarised Developer ID builds run locally but Gatekeeper blocks them on other Macs.
- Windows code signing is not set up: Release 1 ships an unsigned installer (owner, 2026-11-11), so SmartScreen warns
  until it has a reputation; the download page says how to continue. Signing (e.g. Azure Trusted Signing) can come later.
