---
id: CHG-0046
title: Search: home page in the sitemap, canonical and crawlable links
status: proposed
date: 2026-11-26
specs: [SPEC-SHARING-BLOKDUST-GLOSSARY, SPEC-SHARING-BACKEND]
adrs: []
---
# CHG-0046: Search: home page in the sitemap, canonical and crawlable links

## Why

The sitemap lists every guide page but not `/`, the page people search for. `/` is a canvas with no text or links, no canonical URL and no preview image, so a crawler reaching it finds nothing that leads into the guide.

## What changes

- `/sitemap.xml` lists `/` first, then every guide page (SPEC-SHARING-BLOKDUST-GLOSSARY R4).
- `/` and `/index.html` get a canonical link to the site root and the guide's default card as `og:image` (SPEC-SHARING-BACKEND R9a).
- Without JavaScript, `/` says what BlokDust is and links to the guide, Get Started, Blocks and Downloads (R9a). With JavaScript the app looks as before.
- The site is named **BlokDust 2**: the home page is titled "BlokDust 2 | Build instruments and self-playing music" with the owner's new description, link previews and oEmbed name BlokDust 2, and guide titles end in "| BlokDust 2 Guide" (owner, 2026-11-26; R9a, R4).
- The guide test fails on any link to blokdust.com or guide.blokdust.com, which now serve spam (R4).

## Out of scope

Structured data, Search Console and Bing verification, and indexing gallery patches are left for the owner to decide.

## Acceptance

- `pnpm site:build && pnpm test:glossary` passes: the sitemap has `/` and every guide page, and `/` links to the guide without JavaScript.
- `pnpm test:sharing` passes the R9a checks for `/` and `/index.html`.
- `pnpm check` passes.

## Risks and unknowns

Google renders JavaScript, so it may give little weight to `<noscript>` text. It still reads the links in the raw HTML.
