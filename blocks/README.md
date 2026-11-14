# Blocks

One manifest per block: `blocks/<category>/<id>.block.json`, validated by [`schema/block.schema.json`](schema/block.schema.json). Manifests are the single source of truth (DATA-0002): engine params, UI panels, geometry, the design library and MCP schemas are generated from them.

## Where the data comes from
- **Geometry, outline, defaults, v1 UI sliders:** extracted from the running v1 app by `pnpm bd v1 extract`. The tool intercepts v1's own `BlockSprites` drawing calls, so polygons and palette indices are exact.
- **Palettes:** `v1-palettes.json` holds all 13 v1 themes (resolved colours plus role indices: txt, menu, options, power).
- **Verification:** `pnpm bd v1 verify` re-renders every manifest with Canvas2D at v1's recorded stage metrics and diffs it against the v1 reference screenshots (1× and 2× DPR).

## Draft → final
Extracted manifests are `"draft": true`. To finalise a block (Phase 1, per block):
1. Resolve every `review` note. Give each param a real `unit`, `range` and `curve`, and record the v1 slider mapping (e.g. emitter `rate`: v1 slider `510 - rate` frames → seconds at the 60 fps reference, SIMULATION-0003).
2. Implement the DSP and pass golden-audio tests.
3. Pass visual parity.
4. Set `"draft": false`. Re-running `bd v1 extract` never overwrites a non-draft manifest.
