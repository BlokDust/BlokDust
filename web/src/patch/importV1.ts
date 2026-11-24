// v1 composition (save file) → v2 patch + view (DATA-0004). Flattens v1's recursive Effects/Sources nesting.
import { BLOCKS } from '../generated/blocks.gen.ts';
import type { Patch, PatchBlock } from './loadPatch.ts';

export interface V1Block {
  Id: number;
  Type: string;
  Position: { x: number; y: number };
  ZIndex?: number;
  Params?: Record<string, unknown>;
  Effects?: unknown[];
  Sources?: unknown[];
}
export interface V1Composition {
  Composition: unknown[];
  ZoomLevel?: number;
  DragOffset?: { x: number; y: number };
  ColorThemeNo?: number;
}
export interface V1View {
  zoom: number;
  drag: { x: number; y: number };
  theme: number;
}

const V1_ALIASES: Record<string, string> = {
  Gain: 'Volume',
  Pitch: 'PitchShifter',
  Delay: 'StereoDelay',
  Convolution: 'Convolver',
};
const byV1Type = new Map(BLOCKS.filter((b) => b.v1Type).map((b) => [b.v1Type!, b]));

export function importV1(comp: V1Composition): {
  patch: Patch;
  view: V1View;
  v1Ids: Map<string, number>;
} {
  const found = new Map<number, V1Block>();
  const visit = (items: unknown[] | undefined) => {
    for (const it of items ?? []) {
      if (!it || typeof it !== 'object') continue; // numeric back-references to blocks already seen
      const b = it as V1Block;
      if (!found.has(b.Id)) found.set(b.Id, b);
      visit(b.Effects);
      visit(b.Sources);
    }
  };
  visit(comp.Composition);
  // v1 App.Blocks order = deserialisation order; keep ZIndex order when present.
  const ordered = [...found.values()].sort((a, b) => (a.ZIndex ?? 0) - (b.ZIndex ?? 0));
  const blocks: PatchBlock[] = [];
  const v1Ids = new Map<string, number>();
  for (const b of ordered) {
    const def = byV1Type.get(V1_ALIASES[b.Type] ?? b.Type);
    if (!def) throw new Error(`unknown v1 block type ${b.Type}`);
    const params: Record<string, unknown> = {};
    for (const [k, value] of Object.entries(b.Params ?? {}))
      if (
        def.params.some((param) => param.key === k) &&
        (typeof value === 'number' || typeof value === 'boolean')
      )
        params[k] = value;
    const id = `v1-${b.Id}`;
    v1Ids.set(id, b.Id);
    blocks.push({ id, type: def.id, x: b.Position.x, y: b.Position.y, params });
  }
  return {
    patch: { format: 'blokdust.patch', version: 2, seed: 1, blocks },
    view: {
      zoom: comp.ZoomLevel ?? 1,
      drag: comp.DragOffset ?? { x: 0, y: 0 },
      theme: comp.ColorThemeNo ?? 0,
    },
    v1Ids,
  };
}
