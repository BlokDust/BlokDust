---
id: CHG-0047
title: About links to the BlokDust 2 guide
status: proposed
date: 2026-11-26
specs: [SPEC-SHARING-BLOKDUST-GLOSSARY]
adrs: []
---
# CHG-0047: About links to the BlokDust 2 guide

## Why

The app doesn't link to its guide. v1 had a guide button in Settings › CONNECT, but that tab now holds feedback, and v1's target, guide.blokdust.com, now serves spam.

## What changes

- Settings › ABOUT shows v1's guide line and button under the three people (SPEC-SHARING-BLOKDUST-GLOSSARY R5). The owner chose the place (below the names) and the words (2026-11-26): "Visit the BlokDust 2 guide for information, tutorials & more." and a BLOKDUST 2 GUIDE button.
- It opens `https://blokdust.funputs.com/guide/` in a new window, with v1's hover pointer. It's hidden where links can't open (an iPad host) and where there is no room above the footer.

## Out of scope

Bringing back CONNECT's social links and share buttons.

## Acceptance

- `pnpm web:build && pnpm test:ui-regressions --only about-guide-link,ipad-extension-no-links` passes: at 1000×528, 1000×290 and 390×844 the button sits under the people and above the footer, hovering changes it and a press opens the guide; with no links it isn't drawn.
- `pnpm check` and `pnpm lint` pass.

## Risks and unknowns

On very short plugin windows, there's no room for the block, so it's hidden.
