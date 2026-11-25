// pnpm test:stage (after `pnpm web:build`): the stage app (CHG-0001 0.9) black-box, with a real
// pointer and AudioWorklet, observed only via the read-only probe.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { serveDist } from './serve.ts';

const { url, server } = await serveDist();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const checks: Record<string, boolean | number | string> = {};
const failed: string[] = [];
const check = (name: string, pass: boolean, detail: number | string = '') => {
  checks[name] = pass ? (detail === '' ? true : detail) : `FAIL ${detail}`;
  if (!pass) failed.push(name);
};
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // No Worker here: the API's start-up calls answer 404, logged as "Failed to load resource"
  // without the URL. Those are expected; any other failed request is not.
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource'))
      errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !new URL(response.url()).pathname.startsWith('/api/'))
      errors.push(`${response.status()} ${response.url()}`);
  });
  // The test scene: a first visit opens an empty stage.
  await page.goto(`${url}/index.html?demo`);
  await page.waitForFunction(() => window.__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => window.__bd_probe.state.snapshots > 20, null, {
    timeout: 15000,
  });
  const state = () => page.evaluate(() => window.__bd_probe.state);

  let snapshot = await state();
  const pairs = (connections: number[]) => connections.length / 2;
  check('engine started', snapshot.started);
  check(
    'connections from proximity',
    pairs(snapshot.connections) >= 3,
    pairs(snapshot.connections),
  );
  check('powered bass makes sound', snapshot.rms > 0.001, +snapshot.rms.toFixed(4));

  await page.waitForTimeout(3000);
  snapshot = await state();
  check('emitter particles hit sources', snapshot.hits >= 2, snapshot.hits);
  check('gates open', snapshot.gateOns >= 2, snapshot.gateOns);
  mkdirSync('tests/visual/output', { recursive: true });
  await page.screenshot({ path: 'tests/visual/output/stage.png' });

  // Drag the Filter (grid 4,-5) 12 cells right with the real pointer: the lead→filter connection
  // must disappear.
  const before = pairs(snapshot.connections);
  const filter = snapshot.blocks.find((block) => block.type === 'fx.filter');
  if (!filter) throw new Error('no Filter on the stage');
  const [fx, fy] = await page.evaluate(
    ([x, y]) => window.__bd_probe.toCss(x, y),
    [filter.x, filter.y + 0.3],
  );
  const [tx, ty] = await page.evaluate(
    ([x, y]) => window.__bd_probe.toCss(x, y),
    [filter.x + 12, filter.y + 0.3],
  );
  await page.mouse.move(fx, fy);
  await page.mouse.down();
  await page.mouse.move(tx, ty, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  snapshot = await state();
  const moved = snapshot.blocks.find((block) => block.type === 'fx.filter');
  if (!moved) throw new Error('the Filter is gone');
  check(
    'drag moved the block by 12 cells',
    moved.x === filter.x + 12 && moved.y === filter.y,
    `${moved.x},${moved.y}`,
  );
  check(
    'dragging out of range disconnects',
    pairs(snapshot.connections) === before - 1,
    `${before} -> ${pairs(snapshot.connections)}`,
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.screenshot({ path: 'tests/visual/output/stage-after-drag.png' });
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify(checks));
if (failed.length) process.exit(1);
