---
id: DATA-0003
title: No hosted samples; reference third-party Creative Commons audio
status: superseded
date: 2026-11-05
domain: data
tags: [samples, cost, freesound]
supersedes: []
superseded_by: DATA-0005
---
# DATA-0003: No hosted samples; reference third-party Creative Commons audio

## Context
v1 stored only SoundCloud track references, never audio. The owner does not want to store audio, carry copyright liability, or pay for storage.

## Decision
Patches store **references**, never audio: `{ provider: "freesound", id, license, attribution }`. The default provider is the **Freesound API v2**: CC0/CC-BY/CC-BY-NC sounds, preview MP3/OGG, token auth, no OAuth needed for previews. A Cloudflare Worker proxies API calls so the key stays out of the client. Responses may be edge-cached (cache, not storage). Local files can be loaded for personal use, but a patch that references them is marked "not portable".

## Consequences
- Attribution is shown in the Sample block panel and the embed.
- SoundCloud is **deferred**. Its API reopened (self-serve with Artist Pro), but its terms bar ripping or capturing content, which granular decoding arguably does. Revisit only with a clear reading of the terms.
- If a referenced sound disappears, the patch still loads and the block shows "missing sample".
