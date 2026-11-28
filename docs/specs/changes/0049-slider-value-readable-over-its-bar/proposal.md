---
id: CHG-0049
title: Slider value readable over its bar
status: proposed
date: 2026-11-27
specs: [SPEC-VISUAL-V1-PARITY]
adrs: []
---
# CHG-0049: Slider value readable over its bar

## Why

While a slider is dragged, v1 draws its value to the right of the handle in the theme's text colour. A slider whose bar starts from the middle (Tone's Note and Fine, pan, and the like) puts its bar under that text when the value is below the middle. In IKKO the text and the first slider are the same dark grey (contrast 1.0), so the value can't be seen while adjusting. Volcanologist and Lucky Sign each have a slider like that too, and most themes have one that is hard to read. v1 had the same bug.

## What changes

- Where the value crosses its own bar, and the theme's text colour contrasts less than 2:1 with the bar while the panel's colour (palette 2) contrasts more, that part of the text is drawn in the panel's colour. The rest of the text keeps the text colour, so a value half on the bar is two-coloured. Everywhere else the value looks exactly as in v1 (SPEC-VISUAL-V1-PARITY R24; owner, 2026-11-27).
- One rewrite in `tools/v1/port-ui.ts` points v1 `OptionSlider`'s value text at `App.SliderValueText` (`web/src/v1ui/sliderValue.ts`). Nothing in `ported/` is hand-edited.

Themes and sliders that change (text colour vs slider colour, under 2:1): MODE STEREO sliders 1 and 3, PENCIL CONTROL 1 and 4, FJORD 5, CONSOLE 3 and 5, FRIENDS 3, KORAL 5, SEA CUCUMBER 4 and 5, ASH PEAK 4 and 5, VOLCANOLOGIST 1, 2, 3 and 5, IKKO 1 and 2, LUCKY SIGN 2.

## Out of scope

The wave slider (Granular/Sample region) draws its value over the waveform, not a bar, and is unchanged. v2's own rows (note bars, range) draw their values off their bars.

## Acceptance

- `pnpm web:build && pnpm test:ui-regressions --only slider-value-readable-on-bar` passes: Tone's Note dragged below the middle shows its value over the bar in the panel's colour in IKKO and PENCIL CONTROL, and in the text colour in FJORD (unchanged). It failed before the fix (no value pixels over the bar in IKKO and PENCIL CONTROL).
- `pnpm bd ui diff` and `pnpm bd visual diff --full` are unchanged (the value shows only while a slider is held).

## Risks and unknowns

The default theme (MODE STEREO) changes too: Note's value below the middle is dark on the cyan bar instead of cream. The 2:1 threshold is one constant (`MIN_CONTRAST`) if the owner wants fewer or more sliders to switch.
