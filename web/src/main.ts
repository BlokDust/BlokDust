// Block library (UI-0003, first cut): every block rendered from its generated manifest, in any v1 theme.
import { Application, Container, Sprite, Text, Texture } from 'pixi.js';
import { BLOCKS } from './generated/blocks.gen.ts';
import { THEMES } from './generated/palettes.gen.ts';
import { bakeBlock } from './render/bakeBlock.ts';

const COLS = 8;
const CELL = 150; // css px per library cell
const GRID = 22; // css px per grid unit (v1 at zoom 2 on an 800px-wide stage ≈ 28)

async function main() {
  const params = new URLSearchParams(location.search);
  let themeIndex = Math.min(Number(params.get('theme') ?? 0), THEMES.length - 1);
  const app = new Application();
  await app.init({
    resizeTo: window,
    antialias: true,
    resolution: devicePixelRatio,
    autoDensity: true,
  });
  document.body.appendChild(app.canvas);
  const stage = new Container();
  app.stage.addChild(stage);

  const draw = () => {
    const theme = THEMES[themeIndex];
    app.renderer.background.color = theme.colors[0];
    for (const child of stage.removeChildren()) child.destroy({ texture: true });
    const dpr = app.renderer.resolution;
    BLOCKS.forEach((def, i) => {
      const cx = (i % COLS) * CELL + CELL / 2 + 20,
        cy = Math.floor(i / COLS) * CELL + CELL / 2 + 20;
      const baked = bakeBlock(def, { colors: theme.colors, gridPx: GRID * dpr });
      const sprite = new Sprite(Texture.from(baked.canvas));
      sprite.scale.set(1 / dpr);
      sprite.position.set(cx + baked.offsetX / dpr, cy - 10 + baked.offsetY / dpr);
      const label = new Text({
        text: def.name,
        style: {
          fill: theme.colors[theme.roles.txt],
          fontSize: 12,
          fontFamily: 'system-ui, sans-serif',
        },
      });
      label.anchor.set(0.5, 0);
      label.position.set(cx, cy + 46);
      stage.addChild(sprite, label);
    });
  };

  const select = document.getElementById('theme') as HTMLSelectElement;
  THEMES.forEach((t) => select.add(new Option(t.name, String(t.index))));
  select.value = String(themeIndex);
  select.onchange = () => {
    themeIndex = Number(select.value);
    draw();
  };
  draw();
}

void main();
