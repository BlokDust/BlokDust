---
id: UI-0010
title: Touchpad plays in its options panel
status: proposed
date: 2026-11-13
domain: ui
tags: [ui, touch, post-2-0]
supersedes: []
superseded_by:
---
# UI-0010: Touchpad plays in its options panel

## Context
The owner compared a Touch Keys piano and a Push-style Touchpad, both drawn inside their options panels (2026-11-13), and
dropped Touch Keys: a piano is a poor touchscreen UI.

## Decision
We will put the Touchpad's pads in its options panel: 8 × 4 on desktop and iPad, 6 × 5 on a phone, in fourths. Rows above
the pads: Key (12 buttons), Scale (a carousel: Major, Minor, Dorian, Lydian, Mixolydian, Pentatonic), switches
(Mono/Poly, In Key, Silent Keys), Octave. Root notes cyan, other scale notes light, held notes red, notes outside the scale dark.
- Every finger on a pad plays its note (multi-touch, extending UI-0006); the mouse plays one.
- Sliding a finger from pad to pad is legato: the held note is bent to the new pad's pitch (per-note bend,
  PLUGIN-0004), so nothing is struck again, in mono and poly alike.
- Playing needs the panel open (accepted trade-off).

## Consequences
- The panel is taller than v1 panels; on a phone it docks full width like every panel.

## Alternatives considered
- **Touch Keys:** dropped. **Pads drawn on the stage:** would compete with blocks for touches.
