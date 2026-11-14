---
id: PLUGIN-0005
title: "Release installers: a notarised universal macOS pkg and an unsigned Windows installer, from downloads.funputs.com"
status: accepted
date: 2026-11-11
domain: plugin
tags: [distribution, release-1]
supersedes: []
superseded_by:
---
# PLUGIN-0005: Release installers: a notarised universal macOS pkg and an unsigned Windows installer, from downloads.funputs.com

## Context
Release 1 offers the plugins for download (CHG-0005 task 12). macOS refuses plugins it can't vouch for, often without
saying why; FUNPUTS already ships notarised installers from downloads.funputs.com (R2 `funputs-releases` behind its
download-analytics Worker). Our builds had silently required the build machine's macOS (minos 26) and Apple silicon.
There is no Windows code-signing certificate.

## Decision
We will ship, per version, from `downloads.funputs.com/releases/blokdust/<version>/` (owner, 2026-11-11):
- **macOS**: `BlokDust-<version>-Mac.pkg`, both plugins as VST3, AU and Standalone, universal (arm64 + x86_64), macOS 11+,
  Developer ID signed, the package signed with Developer ID Installer, notarised and stapled (`bd plugin package`).
- **Windows**: `BlokDust-<version>-Windows.exe` (Inno Setup), both VST3s to Common Files\VST3 and both Standalones, x64,
  **unsigned** for Release 1 (`bd win package`, which also installs and uninstalls it silently in the VM).
- One version everywhere: the root `package.json`'s. `bd release publish` uploads new files only (a published URL never
  changes), checks each URL serves the built bytes, and writes `web/src/releases.json`, which Settings › DOWNLOAD reads.

## Consequences
- The deployment target is set before `project()` (FUNPUTS' lesson): every binary now says minos 11.0. The golden
  renders through the built VST3 are bit-identical on arm64 and under Rosetta (x86_64).
- SmartScreen warns about the Windows installer until it has a reputation; the download page explains "More info → Run
  anyway". Signing can be added later without changing anything else.
- Downloads are counted (owner, 2026-11-11): Funputs' download-analytics Worker records them as product `blokdust`
  with their version (a FUNPUTS change: an optional product folder that must name the file's product). The file
  names follow its `<PRODUCT>-<version>-Mac|Windows` pattern.
- Notarisation needs the `blokdust` notarytool profile in the build machine's login keychain (docs/engineering/signing.md).

## Alternatives considered
- **GitHub Releases**: free, but the repo is private until launch.
- **A new R2 bucket served by the BlokDust Worker**: keeps projects apart, but a new resource for the same job.
- **Windows signing now** (Azure Trusted Signing): a monthly cost and days of identity checks before a quiet launch.
- **A zip of bundles** instead of installers: users would have to know where VST3s and AUs go.

## Amendments
- **2026-11-12 (owner, CHG-0010, from 2.0.1):** BlokDust FX ships as VST3 and AU only (no FX Standalone); the
  instrument keeps its Standalone app. The Windows download is `BlokDust-<version>-Windows.zip`: the installer `.exe`
  plus a `README.txt` with the SmartScreen steps, which the download page no longer shows. Funputs' download-analytics
  Worker counts `.exe`/`.msi`, not this zip, so Windows downloads go uncounted until it learns
  `<PRODUCT>-<version>-Windows.zip` (a FUNPUTS change, not made here).
