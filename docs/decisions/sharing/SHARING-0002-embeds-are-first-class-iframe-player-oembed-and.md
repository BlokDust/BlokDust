---
id: SHARING-0002
title: Embeds are first-class: iframe player, oEmbed and Open Graph
status: accepted
date: 2026-11-05
domain: sharing
tags: [embed, oembed, social]
supersedes: []
superseded_by:
---
# SHARING-0002: Embeds are first-class: iframe player, oEmbed and Open Graph

## Context
Owner's goal: patches that are playable where they are shared.

## Decision
- `/embed/<id>`: the player bundle (ARCHITECTURE-0003), with a tap-to-start overlay.
- `/oembed?url=`: rich oEmbed for Reddit, Discord, Notion, WordPress and Medium.
- Every share page carries Open Graph and `twitter:card` tags with a **static thumbnail** (PNG, a few tens of KB), rendered client-side from the stage at save time and stored next to the patch in D1/KV.
- X/Twitter player cards are attempted but not relied on: X gates them.
- **Auto-rendered MP4 previews are deferred.** They are the most reliable way to play inside every feed, but need storage and render cost. Revisit only if there is funding.
