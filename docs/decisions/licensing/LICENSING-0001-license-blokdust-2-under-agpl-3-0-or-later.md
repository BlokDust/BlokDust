---
id: LICENSING-0001
title: License BlokDust 2 under AGPL-3.0-or-later
status: accepted
date: 2026-11-05
domain: licensing
tags: [license, agpl]
supersedes: []
superseded_by:
---
# LICENSING-0001: License BlokDust 2 under AGPL-3.0-or-later

## Context
v1 is MIT. For v2 the owner wants derivative works to stay open. JUCE 8 (see PLUGIN-0001) is dual-licensed AGPLv3/commercial, so an AGPL project can use it without a commercial licence.

## Decision
All BlokDust 2 code is licensed **AGPL-3.0-or-later**. Code ported from v1 keeps its MIT notice in `NOTICE.md`. MIT code may be incorporated into an AGPL work, but not the other way around.

## Consequences
- Anyone who distributes a modified BlokDust (website, plugin, app) must release the corresponding source under the AGPL.
- **Network clause (§13):** anyone who runs a modified BlokDust as a website must offer its source to users. This is the reason to choose AGPL over GPL.
- The AGPL does not cover patches people make. Patches are user data, not derivative code. State this in the README so users know they own their patches.
- Third-party dependencies must be AGPL-compatible: MIT, BSD, ISC, Apache-2.0, zlib, LGPL and GPLv3 all are. GPLv2-only is not.
- App-store distribution (iPad AUv3) needs extra care. See LICENSING-0002.

## Alternatives considered
- **MIT** (v1's licence): allows closed forks, which the owner does not want.
- **GPLv3**: no network clause, so a hosted fork could stay closed.
