// Black-box test of the stage app (CHG-0001 0.9): real pointer, real AudioWorklet, observed only via the read-only probe.
// Usage: pnpm test:stage   (expects `pnpm web:build`)
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { serveDist } from './serve.ts';

const { url, server } = await serveDist();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const checks: Record<string, boolean | number | string> = {};
let ok = true;
const check = (name: string, pass: boolean, detail: number | string = '') => { checks[name] = pass ? (detail === '' ? true : detail) : `FAIL ${detail}`; ok &&= pass; };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${url}/index.html`);
  await page.waitForFunction(() => (window as any).__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 20, null, { timeout: 15000 });
  const state = () => page.evaluate(() => (window as any).__bd_probe.state);

  let s = await state();
  const pairs = (c: number[]) => c.length / 2;
  check('engine started', s.started);
  check('connections from proximity', pairs(s.connections) >= 3, pairs(s.connections));
  check('powered bass makes sound', s.rms > 0.001, +s.rms.toFixed(4));

  await page.waitForTimeout(3000);
  s = await state();
  check('emitter particles hit sources', s.hits >= 2, s.hits);
  check('gates open', s.gateOns >= 2, s.gateOns);
  mkdirSync('tests/visual/output', { recursive: true });
  await page.screenshot({ path: 'tests/visual/output/stage.png' });

  // Drag the Filter (grid 4,-5) 12 cells right with the real pointer: the lead→filter connection must disappear.
  const before = pairs(s.connections);
  const filter = s.blocks.find((b: any) => b.type === 'fx.filter');
  const [fx, fy] = await page.evaluate(([x, y]) => (window as any).__bd_probe.toCss(x, y), [filter.x, filter.y + 0.3]);
  const [tx, ty] = await page.evaluate(([x, y]) => (window as any).__bd_probe.toCss(x, y), [filter.x + 12, filter.y + 0.3]);
  await page.mouse.move(fx, fy); await page.mouse.down();
  await page.mouse.move(tx, ty, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(400);
  s = await state();
  const moved = s.blocks.find((b: any) => b.type === 'fx.filter');
  check('drag moved the block by 12 cells', moved.x === filter.x + 12 && moved.y === filter.y, `${moved.x},${moved.y}`);
  check('dragging out of range disconnects', pairs(s.connections) === before - 1, `${before} -> ${pairs(s.connections)}`);
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.screenshot({ path: 'tests/visual/output/stage-after-drag.png' });
} finally { await browser.close(); server.close(); }
console.log(JSON.stringify(checks));
if (!ok) process.exit(1);
