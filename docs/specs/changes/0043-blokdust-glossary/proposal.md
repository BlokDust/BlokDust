---
id: CHG-0043
title: BlokDust glossary
status: proposed
date: 2026-11-20
specs: [SPEC-SHARING-BLOKDUST-GLOSSARY]
adrs: []
---
# CHG-0043: BlokDust glossary

## Why

Give people a guide they can find, read and link to without opening the editor. Recover the original guide’s explanations and bring them up to date for V2.

## What changes

- Astro turns one Markdown file per article into static HTML. The Worker site build includes the generated pages alongside the web app (R1).
- The glossary includes every block on the combined review branch, plus the original guide’s supporting articles. A short repository skill documents the guide’s writing style (R2).
- A shared layout provides mobile-first styling, V2 screenshots in several app themes, semantic navigation and metadata (R3–R4).

## Out of scope

The original Examples page and its saved patches will be revisited once new patches are ready. Copy approval is required before publication.

## Acceptance

- Run `pnpm check` and `pnpm site:build && pnpm test:glossary`.
- Review the Markdown and screenshots in `glossary/src/content/`.
