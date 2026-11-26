// The presets are @blokdust's EXAMPLES; OPEN lists only the user's own patches (R16), run by
// tests/e2e/gallery.ts.
import {
  OUT,
  check,
  panelState,
  type Cast,
  GALLERY,
  press,
  tab,
  idle,
  search,
  bd,
  galleryItems,
} from './harness.ts';
import type { MessageBarState } from '../pageGlobals.ts';

export async function presetExamples({ anon, carol }: Pick<Cast, 'anon' | 'carol'>): Promise<void> {
  // ---- R16 (owner review 3): the presets are @blokdust's EXAMPLES; OPEN lists only the user's own
  // patches ----
  const seeded = bd('presets'),
    again2 = bd('presets');
  await tab(carol, GALLERY);
  await search(carol, '');
  await press(carol, 'sort_examples', 300);
  await idle(carol);
  const examples = await panelState(carol);
  await carol.page.mouse.move(5, 5);
  await carol.page.waitForTimeout(300);
  await carol.page.screenshot({ path: `${OUT}/gallery-examples.png` });
  const want = [
    'Computer Keys + 2 Tones',
    'MIDI Keys + 2 Tones',
    'Microphone + Recorder',
    'Rotating Sequencer',
    'Step Sequencer',
    'Self Playing Scene',
  ];
  check(
    "R16: bd gallery presets publishes the six presets (2.0.2 added Self Playing Scene) as @blokdust's EXAMPLES, in order, once",
    seeded.added?.length === 6 &&
      again2.added?.length === 0 &&
      examples.sort === 'examples' &&
      examples.items.map((item) => item.title).join() === want.join() &&
      examples.items.every((item) => item.by === 'blokdust'),
    {
      seeded,
      again: again2,
      examples: examples.items.map((item) => `${item.title} @${item.by}`),
    },
  );
  // TUTORIALS has no button while there are none (CHG-0035); the API still lists them.
  const tutorialsEmpty = (await galleryItems(anon, 'sort=tutorials')).length;
  const fifth = seeded.added?.[4]?.id;
  if (!fifth) throw new Error('bd gallery presets added no fifth example');
  bd('kind', fifth, 'tutorial');
  const tutorials = (await galleryItems(anon, 'sort=tutorials')).map((row) => row.title);
  const sorts = await carol.page.evaluate(() =>
    window.__bd_probe.scene.PatchesPanel.sortButtons().map((button) => button.label),
  );
  check(
    'R16: bd gallery kind moves one to TUTORIALS (API); the sorts read POPULAR · ALL TIME TOP · NEW · EXAMPLES',
    tutorialsEmpty === 0 &&
      tutorials.join() === 'Step Sequencer' &&
      sorts.join() === 'POPULAR,ALL TIME TOP,NEW,EXAMPLES',
    { tutorialsEmpty, tutorials, sorts },
  );
  await press(carol, 'sort_examples', 300);
  await idle(carol);
  // While the patch is fetched the panel stays up with the spinner, then closes; if it can't be
  // fetched, the message bar says so (no server: check your connection).
  const opening = () =>
    carol.page.evaluate(() => {
      const panel = window.__bd_probe.scene.PatchesPanel;
      const messagePanel = window.__bd_probe.scene.MessagePanel as unknown as MessageBarState;
      return {
        opening: panel.Opening,
        open: panel.Open,
        error: messagePanel.Open ? (messagePanel._Value?.string ?? '') : '',
        blocks: window.__bd_probe.state.patch.blocks.length,
      };
    });
  const blocksBefore = (await opening()).blocks;
  await carol.page.route('**/api/patches/*', (route) =>
    route.request().method() === 'GET' ? route.abort() : route.continue(),
  );
  await press(carol, 'gopen3', 1200);
  if ((await carol.page.evaluate(() => window.__bd_probe.scene.PatchesPanel.View)) === 'confirm')
    await press(carol, 'openAnyway', 1200);
  const failed = await opening();
  await carol.page.unroute('**/api/patches/*');
  await carol.page.route('**/api/patches/*', async (route) => {
    if (route.request().method() === 'GET')
      await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });
  await press(carol, 'gopen3', 600);
  if ((await carol.page.evaluate(() => window.__bd_probe.scene.PatchesPanel.View)) === 'confirm')
    await press(carol, 'openAnyway', 600);
  const during = await opening();
  await carol.page.mouse.move(5, 5);
  await carol.page.waitForTimeout(100);
  await carol.page.screenshot({ path: `${OUT}/opening-spinner.png` });
  await carol.page.waitForFunction(() => !window.__bd_probe.scene.PatchesPanel.Opening, null, {
    timeout: 15000,
  });
  await carol.page.waitForTimeout(1500);
  await carol.page.unroute('**/api/patches/*');
  const landed = await opening();
  check(
    'Owner review 3: while a gallery patch is fetched the panel stays up with the spinner, then closes; a failed fetch says so',
    failed.open &&
      !failed.opening &&
      failed.error.includes('couldn’t be loaded. Check your connection') &&
      failed.blocks === blocksBefore &&
      during.opening &&
      during.open &&
      during.blocks === blocksBefore &&
      !landed.opening &&
      !landed.open &&
      landed.blocks === 10,
    { blocksBefore, failed, during, landed },
  );
  const rotating = await carol.page.evaluate(() => ({
    n: window.__bd_probe.state.patch.blocks.length,
    credit: window.__bd_probe.corners.credit,
  }));
  check(
    'R16: an example opens with all its blocks, credited to @blokdust',
    rotating.n === 10 &&
      rotating.credit?.by === 'blokdust' &&
      rotating.credit.title === 'Rotating Sequencer',
    rotating,
  );
  // Bug (owner review 3): after an INSERT the patch has changes, so OPEN asks first; on the GALLERY
  // tab the question wasn't drawn and its buttons didn't answer, so OPEN seemed to do nothing.
  await tab(carol, GALLERY);
  await idle(carol);
  await press(carol, 'gins0', 300);
  await carol.page.waitForFunction(() => !window.__bd_probe.scene.PatchesPanel.Opening, null, {
    timeout: 15000,
  });
  await carol.page.mouse.move(300, 650, { steps: 4 });
  await carol.page.mouse.click(300, 650);
  await carol.page.waitForTimeout(800);
  await tab(carol, GALLERY);
  await idle(carol);
  await press(carol, 'gopen1', 600);
  const askedText = await carol.page.evaluate(() => {
    const seen: string[] = [];
    const prototype = CanvasRenderingContext2D.prototype;
    const original = Object.getOwnPropertyDescriptor(prototype, 'fillText');
    prototype.fillText = function (text: string, x: number, y: number, maxWidth?: number) {
      seen.push(text);
      const draw = original?.value as CanvasRenderingContext2D['fillText'] | undefined;
      draw?.call(this, text, x, y, maxWidth);
    };
    window.__bd_probe.scene.PatchesPanel.Draw();
    if (original) Object.defineProperty(prototype, 'fillText', original);
    return seen.join(' | ');
  });
  const askedView = await carol.page.evaluate(() => window.__bd_probe.scene.PatchesPanel.View);
  await carol.page.mouse.move(5, 5);
  await carol.page.waitForTimeout(200);
  await carol.page.screenshot({ path: `${OUT}/gallery-open-asks.png` });
  await press(carol, 'openAnyway', 300);
  await carol.page.waitForFunction(() => !window.__bd_probe.scene.PatchesPanel.Opening, null, {
    timeout: 15000,
  });
  await carol.page.waitForTimeout(1500);
  const afterAsk = await opening();
  check(
    'Bug: after an INSERT, OPEN in the gallery asks first (shown, answered) and OPEN ANYWAY opens it',
    askedView === 'confirm' &&
      /REPLACE CURRENT PATCH/i.test(askedText) &&
      !askedText.includes('SEARCH') &&
      !afterAsk.open &&
      afterAsk.blocks === 6,
    { askedView, askedText: askedText.slice(0, 200), afterAsk },
  );
}
