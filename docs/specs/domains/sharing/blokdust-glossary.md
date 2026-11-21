---
id: SPEC-SHARING-BLOKDUST-GLOSSARY
title: BlokDust glossary
status: draft
domain: sharing
adrs: []
updated: 2026-11-20
---
# BlokDust glossary

## Requirements

- **R1.** The main website serves static, directly linkable HTML at `/guide/`, `/about/`, `/blocks/`, `/downloads/`, and the article paths. The cover’s first tile opens the V2 updates article. The Get Started article follows the original guide’s two illustrated tutorials. Keyboard Shortcuts pairs each action with its keys, shows playable notes in piano layouts and describes relevant touchscreen gestures below. Each page offers related guide links. The pages work without JavaScript. The canvas app remains the entry point at `/`.
- **R2.** Every manifest has one block article under `/blocks/`. The index and four category pages list those articles once in their Related sections. The copy and optional example patch links live in Markdown. Supported example links appear only once supplied.
- **R3.** Pages share a mobile-first layout based on the original guide, including its tiled cover, illustrated article banners and menu drawer. Screenshots have alternative text and intrinsic dimensions. New block screenshots come from the V2 app in several of its built-in themes.
- **R4.** Each page has a unique title and description, a canonical URL, social preview metadata and a sitemap entry. The footer links to BlokDust on Instagram and TikTok. The downloads page reads the published desktop installers from the app’s release manifest and shows the iPad app’s availability.

## Verification

`pnpm site:build && pnpm test:glossary` builds the Worker’s public assets and checks the glossary’s pages, links, screenshots, metadata and layout in Chromium. Astro also checks the article list against the manifests during the build.
