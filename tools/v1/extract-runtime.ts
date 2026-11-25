// bd v1 extract, browser side: instantiate each v1 block and record what the manifests need.
// Sprites come from intercepting BlockSprites' drawing calls: exact polygons with palette indices.
import type { V1Session } from './lib.ts';
import type { V1Block, V1Point } from './v1-app.ts';

export interface RecordedPolygon {
  palette: number | null;
  space: string;
  points: number[][];
}

export interface RecordedLayer {
  palette: number | null;
  alpha: number;
  points: number[][];
}

export interface RecordedOverlay {
  name: string;
  source: string;
  scale: string;
  order: string;
  states: Record<string, RecordedLayer[]>;
  roles: { txt: unknown };
}

export interface RecordedBlock {
  category: string;
  type: string;
  chain: string[];
  name: string;
  l10n: { category: string; key: string; name: string; description: string } | null;
  defaults: unknown;
  params: unknown;
  outline: number[][];
  catchment: unknown;
  optionsForm: unknown;
  sprite: { polys: RecordedPolygon[]; xOffset: number; yOffset: number } | null;
  menuOffset: V1Point | null;
  overlays: RecordedOverlay[];
  errors: string[];
}

export interface RecordedRuntime {
  gridSize: number;
  unit: number;
  blocks: RecordedBlock[];
}

export interface RecordedPalette {
  index: number;
  name: string | null;
  url: string | null;
  colors: string[];
  roles: { txt: unknown; menu: unknown; options: unknown; power: unknown };
}

/** Every block in `groups` (category → v1 types), instantiated in the running v1 app. */
export async function recordBlocks(
  session: V1Session,
  groups: Record<string, string[]>,
): Promise<RecordedRuntime> {
  return session.page.evaluate((groups: Record<string, string[]>) => {
    const App = window.App;
    const Point = window.etch?.primitives.Point;
    if (!App || !Point) throw new Error('v1 has not booted');
    const blockSprites = App.BlockSprites;
    const safe = (value: unknown, depth = 0): unknown => {
      if (
        value === null ||
        value === undefined ||
        typeof value === 'number' ||
        typeof value === 'string' ||
        typeof value === 'boolean'
      )
        return value;
      if (typeof value === 'function') return `[fn ${value.name || 'anonymous'}]`;
      if (depth > 4) return '[depth]';
      if (Array.isArray(value))
        return value.slice(0, 50).map((item: unknown) => safe(item, depth + 1));
      if (typeof value === 'object') {
        const fields = value as Record<string, unknown>;
        const ctor = (value.constructor as { name?: string } | undefined)?.name ?? '';
        if (ctor === 'Point' || ('x' in value && 'y' in value && Object.keys(value).length <= 3))
          return { x: fields.x, y: fields.y };
        if (/^(Tone|Audio|Gain|Oscillator)/.test(ctor) || 'context' in value) return `[${ctor}]`;
        const copy: Record<string, unknown> = {};
        for (const key of Object.keys(value)) copy[key] = safe(fields[key], depth + 1);
        return copy;
      }
      return String(value);
    };
    const recordSprite = (name: string, scaled: boolean, starPosition?: V1Point) => {
      const polys: RecordedPolygon[] = [];
      let current: { space: string; points: number[][] } | null = null;
      let color: number | null = null;
      const saved = {
        fill: App.FillColor,
        moveTo: blockSprites.DrawMoveTo,
        lineTo: blockSprites.DrawLineTo,
        floatMoveTo: blockSprites.DrawFloatMoveTo,
        floatLineTo: blockSprites.DrawFloatLineTo,
      };
      App.FillColor = (_ctx: unknown, fillColor: unknown) => {
        color = App.Palette.indexOf(fillColor);
      };
      const recordPoint = (space: string) => (x: number, y: number) => {
        current ??= { space, points: [] };
        current.space = space;
        current.points.push([x, y]);
      };
      blockSprites.DrawMoveTo = recordPoint('grid');
      blockSprites.DrawLineTo = recordPoint('grid');
      blockSprites.DrawFloatMoveTo = recordPoint('unit');
      blockSprites.DrawFloatLineTo = recordPoint('unit');
      const ctx = {
        beginPath: () => {
          current = null;
        },
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {
          if (current) polys.push({ palette: color, space: current.space, points: current.points });
          current = null;
        },
      };
      try {
        blockSprites.DrawSprite(
          { Ctx: ctx },
          new Point(0, 0),
          scaled,
          name.toLowerCase(),
          starPosition,
        );
      } finally {
        App.FillColor = saved.fill;
        blockSprites.DrawMoveTo = saved.moveTo;
        blockSprites.DrawLineTo = saved.lineTo;
        blockSprites.DrawFloatMoveTo = saved.floatMoveTo;
        blockSprites.DrawFloatLineTo = saved.floatLineTo;
      }
      return { polys, xOffset: blockSprites._XOffset, yOffset: blockSprites._YOffset };
    };
    const findL10n = (blockName: string) => {
      for (const [category, value] of Object.entries(App.L10n.Blocks))
        for (const [key, block] of Object.entries(value.Blocks ?? {}))
          if (block.name === blockName)
            return { category, key, name: block.name, description: block.description };
      return null;
    };
    // Screen-space UI that v1 draws attached to certain blocks (does not scale with zoom).
    const recordOverlay = (draw: (ctx: unknown) => void) => {
      const layers: RecordedLayer[] = [];
      let points: number[][] = [];
      let color: number | null = null;
      const saved = App.FillColor;
      App.FillColor = (_ctx: unknown, fillColor: unknown) => {
        color = App.Palette.indexOf(fillColor);
      };
      const ctx = {
        globalAlpha: 1,
        beginPath: () => {
          points = [];
        },
        closePath: () => {},
        moveTo: (x: number, y: number) => {
          points.push([x, y]);
        },
        lineTo: (x: number, y: number) => {
          points.push([x, y]);
        },
        fill: () => {
          layers.push({
            palette: color,
            alpha: ctx.globalAlpha,
            points: points.map(([x, y]) => [x / App.GridSize, y / App.GridSize]),
          });
        },
      };
      try {
        draw(ctx);
      } finally {
        App.FillColor = saved;
      }
      return layers;
    };
    const overlaysFor = (type: string): RecordedOverlay[] => {
      if (type !== 'Recorder') return [];
      const panel = App.MainScene._RecorderPanel;
      const draw = (recording: boolean, hover: boolean) =>
        recordOverlay((ctx) => {
          panel.DrawPanel.call(
            Object.defineProperty(Object.create(panel) as object, 'Ctx', { value: ctx }),
            0,
            0,
            recording,
            hover,
          );
        });
      return [
        {
          name: 'recordButton',
          source: 'app/UI/RecorderPanel.ts',
          scale: 'screen',
          order: 'afterBlocks',
          states: {
            idle: draw(false, false),
            hover: draw(false, true),
            recording: draw(true, false),
          },
          roles: { txt: App.ThemeManager.Txt },
        },
      ];
    };
    const prototypeChain = (block: V1Block | undefined) => {
      type Prototype = { constructor?: { name: string } } | null;
      const chain: string[] = [];
      for (
        let proto = block && (Object.getPrototypeOf(block) as Prototype);
        proto?.constructor && proto.constructor !== Object;
        proto = Object.getPrototypeOf(proto) as Prototype
      )
        chain.push(proto.constructor.name);
      return chain;
    };
    const out: RecordedRuntime = { gridSize: App.GridSize, unit: App.Unit, blocks: [] };
    for (const [category, types] of Object.entries(groups))
      for (const type of types) {
        const errors: string[] = [];
        let block: V1Block | undefined;
        try {
          block = App.BlockCreator.GetBlock(type);
          block.Id = 900000;
          block.Position = new Point(0, 0);
          block.LastPosition = new Point(0, 0);
          block.Init(App.MainScene);
          block.UpdateOptionsForm?.();
        } catch (error) {
          errors.push(`init: ${(error as Error).message}`);
        }
        const chain = prototypeChain(block);
        const name = block?.BlockName ?? type;
        let sprite: ReturnType<typeof recordSprite> | null = null,
          menuSprite: ReturnType<typeof recordSprite> | null = null;
        // Void draws a star pixel at a random per-block position (starPosition).
        const SENTINEL = { x: 1000, y: 2000 };
        try {
          sprite = recordSprite(name, true, new Point(SENTINEL.x, SENTINEL.y));
        } catch (error) {
          errors.push(`sprite: ${(error as Error).message}`);
        }
        try {
          menuSprite = recordSprite(name, false, new Point(SENTINEL.x, SENTINEL.y));
        } catch (error) {
          errors.push(`menuSprite: ${(error as Error).message}`);
        }
        out.blocks.push({
          category,
          type,
          chain,
          name,
          l10n: findL10n(name),
          defaults: safe(block?.Defaults),
          params: safe(block?.Params),
          outline: (block?.Outline ?? []).map((point) => [point.x, point.y]),
          catchment: block?.CatchmentArea ?? null,
          optionsForm: safe(block?.OptionsForm),
          sprite,
          menuOffset: menuSprite ? { x: menuSprite.xOffset, y: menuSprite.yOffset } : null,
          overlays: overlaysFor(type),
          errors,
        });
      }
    return out;
  }, groups);
}

/** Every v1 theme's palette with role indices (txt/menu/options/power are appended entries). */
export async function recordPalettes(session: V1Session): Promise<RecordedPalette[]> {
  const palettes: RecordedPalette[] = [];
  const themeCount = await session.page.evaluate(() => window.App?.ThemeManager.Themes.length ?? 0);
  for (let theme = 0; theme < themeCount; theme++) {
    await session.page.evaluate((index) => {
      window.App?.ThemeManager.LoadTheme(index, false, true);
    }, theme);
    for (
      let i = 0;
      i < 200 && !(await session.page.evaluate(() => window.App?.ThemeManager.Loaded));
      i++
    ) {
      await session.advance(50);
      await session.page.waitForTimeout(5);
    }
    await session.advance(1500); // 800 ms colour tween
    palettes.push(
      await session.page.evaluate((index) => {
        const App = window.App;
        if (!App) throw new Error('v1 has not booted');
        const themeManager = App.ThemeManager;
        const loaded = themeManager.Themes[index];
        return {
          index,
          name: loaded.Name ?? loaded.name ?? null,
          url: loaded.PaletteURL ?? null,
          colors: App.Palette.map((color) => App.ColorManager.ColorString(color)),
          roles: {
            txt: themeManager.Txt,
            menu: themeManager.MenuOrder,
            options: themeManager.OptionsOrder,
            power: themeManager.Power,
          },
        };
      }, theme),
    );
  }
  return palettes;
}
