// The post-2.0 blocks (SCOPE-0005) in v1's blocks menu: their items, in the owner's order, and
// their icons, drawn from the manifest geometry as v1's BlockSprites draws its own.
import { flatLayers } from '../../render/flatLayers.ts';
import { BLOCKS, BLOCKS_BY_ID, type BlockDef } from '../../generated/blocks.gen.ts';
import type { Point } from '../shim.ts';
import { App, PLUGIN_LABELS } from '../shim.ts';

/** The new blocks in each v1 category (the menu then sorts each category: MENU_ORDER). */
const MENU: Partial<Record<string, string[]>> = {
  Source: ['source.stage', 'source.wavetable'],
  Effect: ['fx.compressor', 'fx.chord', 'fx.arpeggiator', 'fx.random-note', 'fx.lfo'],
  Power: ['power.sound-laser', 'power.counter', 'power.chance', 'power.prism', 'power.gate'],
  Interaction: ['input.touchpad', 'input.stage-in'],
};
const NEW_DEFS: BlockDef[] = Object.values(MENU)
  .flatMap((ids) => ids ?? [])
  .map((id) => BLOCKS_BY_ID.get(id))
  .filter((definition): definition is BlockDef => !!definition);
const BY_NAME = new Map(NEW_DEFS.map((definition) => [definition.name.toLowerCase(), definition]));
const BY_MENU_ID = new Map(BLOCKS.map((definition) => [definition.menuId, definition]));

/** Menu order by menu id (CHG-0035). Ids not on this branch are skipped. */
export const MENU_ORDER: Partial<Record<string, string[]>> = {
  Source: [
    'ToneSource',
    'Noise',
    'Wavetable',
    'Sample',
    'Granular',
    'Microphone',
    'Recorder',
    'SampleGen',
    'Stage',
  ],
  Power: [
    'Power',
    'ParticleEmitter',
    'Laser',
    'Toggle',
    'Pulse',
    'Counter',
    'Chance',
    'SoundLaser',
    'Prism',
    'Gate',
    'Void',
  ],
  Interaction: ['ComputerKeyboard', 'MIDIController', 'Touchpad', 'Label', 'StageIn'],
};

/** The menu id of a Label (scene.CreateBlockFromType hands it to the host like a block type). */
export const LABEL_MENU_ID = 'Label';

interface MenuEntry {
  name: string;
  id: string;
  description: string;
}

/** Add the new blocks to v1's menu JSON (once, before the header is populated). */
export function installNewBlockMenu(): void {
  for (const category of App.BlockCreator.MenuJson.categories) {
    for (const id of MENU[category.name] ?? []) {
      const def = BLOCKS_BY_ID.get(id);
      if (def && !category.items.some((item) => item.id === def.menuId))
        category.items.push({ name: def.name, id: def.menuId, description: def.description });
    }
    // Label (CHG-0020): not a block, but it is made from the Interaction menu like one.
    if (
      category.name === 'Interaction' &&
      !category.items.some((item) => item.id === LABEL_MENU_ID)
    )
      category.items.push({ name: 'Label', id: LABEL_MENU_ID, description: 'A text box.' });
    // Every block's hint (the menu's ?) is its manifest's description, v1's too (CHG-0035); the
    // plugin keeps its own words for Audio Input and MIDI Input.
    for (const item of category.items) {
      const def = BY_MENU_ID.get(item.id);
      if (def && !(App.IsPlugin && PLUGIN_LABELS[item.id])) item.description = def.description;
    }
    // The most used first (MENU_ORDER); Effects, and blocks not listed, by the name shown.
    const order = MENU_ORDER[category.name] ?? [],
      rank = (id: string) => {
        const i = order.indexOf(id);
        return i < 0 ? order.length : i;
      };
    category.items.sort(
      (a, b) =>
        rank(a.id) - rank(b.id) || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
    );
  }
  setMenuHidden(ONLY_INSIDE); // the outer stage's menu
}

/** Every category's full menu, kept before the first hiding. */
let fullMenu: Map<string, MenuEntry[]> | null = null;
/** Menu ids offered only inside a Stage block. */
export const ONLY_INSIDE = new Set(['StageIn']);
/** Hide these menu ids (inside a Stage block: no Stage; outside: no Stage In; CHG-0021). The
 * header is populated again by the scene's next sync. */
export function setMenuHidden(hidden: Set<string>): void {
  const categories = App.BlockCreator.MenuJson.categories;
  fullMenu ??= new Map(categories.map((category) => [category.name, category.items.slice()]));
  for (const category of categories)
    category.items.splice(
      0,
      category.items.length,
      ...(fullMenu.get(category.name) ?? []).filter((item) => !hidden.has(item.id)),
    );
}

/** A Label's menu icon: a dot and a line of text, as it looks on the stage. */
function drawLabelSprite(ctx: CanvasRenderingContext2D, pos: Point): void {
  const unit = App.Unit,
    dot = 3 * unit,
    x = pos.x - 16 * unit,
    y = pos.y + App.GridSize * 0.5;
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.beginPath();
  ctx.moveTo(x - dot, y);
  ctx.lineTo(x, y - dot);
  ctx.lineTo(x + dot, y);
  ctx.lineTo(x, y + dot);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.font = `400 ${Math.round(12 * unit)}px Dosis`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('ABC', x + 8 * unit, y);
  ctx.restore();
}

/** v1 BlockSprites.DrawSprite for a new block (unscaled: menu icons and items dragged from it). */
export function drawNewSprite(ctx: CanvasRenderingContext2D, pos: Point, name: string): boolean {
  if (name === 'label') {
    drawLabelSprite(ctx, pos);
    return true;
  }
  const def = BY_NAME.get(name);
  if (!def) return false;
  const grid = App.GridSize,
    [offsetX, offsetY] = def.geometry.menuOffset ?? [0, 0];
  // Grid layers flattened as on the stage (no hairline of a hidden face at the outer edge).
  const flat = flatLayers(def.geometry.layers, def.geometry.unitsPerGrid ?? 15);
  def.geometry.layers.forEach((layer, k) => {
    // Pixel layers are in v1 units; anchored ones (the Void's random star) stay out of the menu.
    if (layer.units === 'unit' && layer.anchor) return;
    const at = (x: number, y: number): [number, number] =>
      layer.units === 'unit'
        ? [pos.x + offsetX * grid + x * App.Unit, pos.y + offsetY * grid + y * App.Unit]
        : [pos.x + (offsetX + x) * grid, pos.y + (offsetY + y) * grid];
    ctx.beginPath();
    for (const points of layer.units === 'unit' ? [layer.points] : flat[k].paths) {
      points.forEach(([x, y], i) => {
        const [px, py] = at(x, y);
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
      ctx.closePath();
    }
    App.FillColor(ctx, App.Palette[layer.palette]);
    ctx.fill();
  });
  return true;
}
