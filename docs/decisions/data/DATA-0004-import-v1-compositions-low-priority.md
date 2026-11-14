---
id: DATA-0004
title: Import v1 compositions (low priority)
status: accepted
date: 2026-11-05
domain: data
tags: [v1, import]
supersedes: []
superseded_by:
---
# DATA-0004: Import v1 compositions (low priority)

## Decision
A one-way importer converts v1 save JSON to the v2 format: types by name, slider-space params to real units, frame timing at a 60 fps reference. No v1 database survives, so this mainly serves visual-parity fixtures (UI-0002) and any patches users still hold as JSON.
