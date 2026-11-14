---
id: LICENSING-0002
title: Contributor terms that keep app-store distribution possible
status: deferred
date: 2026-11-05
domain: licensing
tags: [license, contributors, ios]
supersedes: []
superseded_by:
---
# LICENSING-0002: Contributor terms that keep app-store distribution possible

## Context
The Apple App Store terms add restrictions the (A)GPL forbids, which is why VLC was pulled in 2011. While the owner holds all copyright, they can grant themselves any permission. Once outside contributions arrive under plain AGPL, shipping them on the App Store (iPad AUv3, UI-0004) becomes legally murky. JUCE's own AGPL option has the same problem on iOS.

## Decision (deferred)
The owner prefers a **short Contributor License Agreement (CLA)**: contributors keep their copyright but grant the maintainer the right to distribute their contributions under other terms too, such as app stores. No per-commit sign-off (DCO) is required.

Deferred until the first external pull request is expected. Before then: pick a standard short CLA (e.g. the Apache ICLA, shortened) and enforce it with a CLA bot. For iOS, also buy a JUCE Starter or commercial licence if JUCE's AGPL terms block App Store distribution.

## Consequences
The repo is single-author until this is done, which is fine for now.
