---
id: LICENSING-0003
title: Use the JUCE 8 Starter licence for the iPad App Store build
status: accepted
date: 2026-11-15
domain: licensing
tags: [license, juce, ios, app-store]
supersedes: []
superseded_by:
---
# LICENSING-0003: Use the JUCE 8 Starter licence for the iPad App Store build

## Context
The iPad AUv3 (CHG-0025) ships on the App Store. App Store terms add restrictions that the (A)GPL forbids, so JUCE's
AGPL option cannot cover that build (LICENSING-0002). The owner already holds a JUCE 8 licence for FUNPUTS: that
project's launch audit (2026-08-28) records the JUCE account as **JUCE 8 Starter, Active**, and its third-party
notices ship JUCE 8.0.15 under the JUCE 8 EULA. The Starter tier lets an individual with up to $20,000 of
JUCE-related revenue or funding in the previous 12 months distribute products, with no splash screen. BlokDust pins
the same JUCE version (8.0.15).

## Decision
The iPad App Store build of BlokDust links JUCE under the owner's JUCE 8 Starter licence (owner, 2026-11-15). The
BlokDust code in it is distributed by the owner, who holds its copyright. The desktop plugins and the source repository
stay AGPL-3.0-or-later (LICENSING-0001).

## Consequences
- The Starter revenue limit counts FUNPUTS and BlokDust together. Move to JUCE Indie before their combined
  JUCE-related revenue goes over the limit.
- The iPad app's notices name JUCE under the JUCE 8 EULA (as FUNPUTS does), not the AGPL.
- Outside contributions still need LICENSING-0002's CLA before they can ship in the App Store build.
- The account identifier stays out of the repository.

## Alternatives considered
- **JUCE under AGPL on the App Store**: App Store terms conflict with the AGPL (the reason VLC was pulled in 2011).
- **A paid JUCE Indie licence now**: not needed while revenue stays under the Starter limit.
