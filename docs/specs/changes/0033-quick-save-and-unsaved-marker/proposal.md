---
id: CHG-0033
title: Quick save and unsaved marker
status: proposed
date: 2026-11-17
specs: [SPEC-SHARING-BACKEND]
adrs: [SHARING-0001]
---
# CHG-0033: Quick save and unsaved marker

## Why
Editing a patch you saved before gives no sign that the changes are unsaved, so it is easy to forget to save (owner,
2026-11-17). Saving again means opening Patches › SAVE every time.

## What changes
- **Cmd/Ctrl+S** (SPEC-SHARING-BACKEND R18): saves over this device's own link (same link, same title, gallery left as
  it is, no video, no panel), and v1's message bar (MessagePanel, now ported) says SAVED. With no link of its own it
  opens Patches › SAVE. The standalone app opens Patches › SAVE too (it keeps no link); in a DAW the key is the DAW's.
- **Top-left line** (R19): your own saved patch shows its title; changed since saving, `TITLE  ·  UNSAVED`. Under the
  mouse UNSAVED reads SAVE, underlined like the corner's other links; pressing it saves. Other people's patches keep
  "TITLE BY @NAME" with no marker.
- **Unsaved edits after a reload** (R20): the existing local copy brings them back, marked UNSAVED.

## Out of scope
- Saving automatically: the owner chose not to (trying things out must not overwrite a saved patch).
- A "leave page?" warning.
- The standalone app saving over its own link (it would need the edit token and the bot check without a browser).
- Cmd/Ctrl+S for patches saved only as files.

## Acceptance
- `pnpm test:sharing --only quick-save`: R18–R20 against the local Worker (10 checks).
- `pnpm test:ui-regressions --only quick-save-no-link-opens-save,quick-save-plugin-keys`.
- Both fail on review/combined before this change.

## Risks and unknowns
- A published patch is updated in the gallery by Cmd/Ctrl+S without a question (owner, 2026-11-17: that is fine).
