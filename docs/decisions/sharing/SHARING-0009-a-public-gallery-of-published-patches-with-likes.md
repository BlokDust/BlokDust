---
id: SHARING-0009
title: A public gallery of published patches with likes and reports
status: proposed
date: 2026-11-15
domain: sharing
tags: [sharing, gallery, moderation]
supersedes: []
superseded_by:
---
# SHARING-0009: A public gallery of published patches with likes and reports

## Context
The owner wants a page where everyone's patches can be found and voted on (2026-11-15). It should use up votes only,
be filterable by block, and show who made each patch. That encourages people to make patches and puts them in front
of other BlokDust users, not only the creator's social followers.

Moderation can start small: "a simple check on save and a report button", with real moderation if it takes off.
SHARING-0001 kept the gallery out at launch because of moderation; SHARING-0008 now gives handles and sign-in.
DATA-0005 means a patch that uses the creator's own audio files can't play for anyone else.

## Decision
- **Publishing is opt-in, per patch:** PUBLISH THIS PATCH. Existing links are never listed.
- **Who can publish:** the owner, signed in with a handle.
- **What can be published:** the patch must have blocks, a title that passes the word check, and no audio files from
  the user's device or Recorder recordings.
- **Likes only, no down votes:** one per signed-in person.
  - Popular = (likes + 2 × remixes + 1) ÷ (hours since published + 2), so new patches get a chance.
  - Remixes are counted from the `parent` lineage patches already have.
- **Search instead of a block picker:** one field matches titles, block types ("laser") and `@name`.
- **Reports:** signed-in people can report a patch, once each. Three reports hide it until the site owner reviews it
  with `pnpm bd gallery reports|keep|hide|remove`.
- **In the app:** the gallery is a tab of the Patches panel, drawn with v1 pieces (SoundcloudPanel's search and rows).
  There is no separate website.
- Saving a published patch updates its gallery entry. A save that makes it unpublishable (rude title, local audio)
  withdraws it.

## Consequences
- Moderation work is light but real: someone has to run `bd gallery reports` now and then. If the gallery grows, a
  moderator queue page and rate limits per account would be next.
- No thumbnails in the rows yet: the share thumbnails exist, so they could be added.
- The EU DSA and UK Online Safety Act expect a way to report content and act on reports. The report button and review
  tool are that, at this scale.

## Alternatives considered
- **Up and down votes**: put off beginners and invite brigading; no.
- **A separate gallery website**: new design outside v1's look; the panel keeps to v1 pieces.
- **Anonymous likes and reports** (Turnstile and IP): easy to stuff; signing in is required instead.
