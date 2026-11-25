// Samples: Freesound search, dropped files and missing files in shared patches
// (SPEC-SHARING-BACKEND), run by tests/e2e/sharing.ts.
import { type Page } from 'playwright';
import { sineWav } from '../mock-services.ts';
import {
  type SharingTests,
  remote,
  created,
  base,
  check,
  probe,
  renderHash,
  OUT,
  open,
  openShare,
  shareVia,
  idOf,
  local,
  closeShare,
  searchLimitedAt,
  editTokenOf,
  mockServices,
} from './harness.ts';
import { located } from '../located.ts';
import type { SelectedBlockView } from '../pageGlobals.shared.ts';
import type { FileRef, FreesoundRef } from '../../../web/src/patch/samples.ts';

/** css px of a point in v1 device px (the v1 UI works in device px). */
const v1Css = (page: Page, fn: string) =>
  page.evaluate<[number, number]>(
    `(() => { const s = window.__bd_probe, A = s.v1App, u = A.Unit, pr = A.Metrics?.PixelRatio ?? devicePixelRatio; const r = (${fn})(s, A, u); return [r[0] / pr, r[1] / pr]; })()`,
  );
/** The Sample blocks on the stage: their track, and whether its audio is loaded. */
const sampleState = (page: Page) =>
  page.evaluate(() =>
    window.__bd_probe.samples.map((sample) => ({
      ...sample,
      track: typeof sample.track === 'string' ? sample.track : '',
    })),
  );

/** Open the options panel of the block at grid (gx, gy) with a real click, then its sample row's
 * search button. */
async function openSamplePanel(page: Page, gx: number, gy: number): Promise<void> {
  const id = await page.evaluate(
    ([a, b]) => window.__bd_probe.state.blocks.find((block) => block.x === a && block.y === b)?.id,
    [gx, gy],
  );
  if (id === undefined) throw new Error(`no block at ${gx}, ${gy}`);
  const [x, y] = located(
    await page.evaluate((blockId) => window.__bd_probe.blockPoint(blockId), id),
    `block ${id}`,
  );
  await page.mouse.click(x, y);
  await page.waitForFunction(() => window.__bd_probe.scene.OptionsPanel.Scale === 1, null, {
    timeout: 5000,
  });
  await page.waitForTimeout(400);
  // v1 OptionsPanel hit rect for a "sample" option: HandleRoll[0] = x from Margin + 65% of Range,
  // full row height.
  const [sx, sy] = await v1Css(
    page,
    `(s) => { const o = s.scene.OptionsPanel, opt = o.Options.find(q => q.Type === 'sample');
    return [o.Position.x + o.Margin + o.Range * 0.82, o.Position.y + opt.Position.y + opt.Size.height * 0.5]; }`,
  );
  await page.mouse.move(sx, sy);
  await page.waitForTimeout(100);
  await page.mouse.click(sx, sy);
  await page.waitForFunction(() => window.__bd_probe.scene.SoundcloudPanel.Open, null, {
    timeout: 5000,
  });
  await page.waitForTimeout(700);
}
/** Drop a file on the stage at grid (gx, gy) as the browser would (a DragEvent with a
 * DataTransfer). */
async function dropFile(
  page: Page,
  gx: number,
  gy: number,
  name: string,
  bytes: Buffer,
): Promise<void> {
  const [x, y] = await page.evaluate(([a, b]) => window.__bd_probe.toCss(a, b), [gx, gy + 0.3]);
  await page.evaluate(
    ([b64, fileName, cx, cy]) => {
      const bin = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bin], fileName, { type: 'audio/wav' }));
      const canvas = document.querySelector('#stage canvas:last-of-type');
      if (!canvas) throw new Error('no stage canvas');
      const boundingClientRect = canvas.getBoundingClientRect();
      const at = {
        clientX: boundingClientRect.left + cx,
        clientY: boundingClientRect.top + cy,
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      };
      canvas.dispatchEvent(new DragEvent('dragover', at));
      canvas.dispatchEvent(new DragEvent('drop', at));
    },
    [bytes.toString('base64'), name, x, y] as const,
  );
}
export const sampleTests: SharingTests = {
  samples: async (browser) => {
    const wait = searchLimitedAt + 61000 - Date.now();
    if (wait > 0) {
      console.error(
        `  (waiting ${Math.ceil(wait / 1000)} s for api-guards' search limit to reset)`,
      );
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    // A Sample next to a Power block (v1 composition import, DATA-0004).
    const comp = {
      Composition: [
        { Id: 1, Type: 'Sample', Position: { x: 0, y: 2 }, ZIndex: 1 },
        { Id: 2, Type: 'Power', Position: { x: -3, y: 2 }, ZIndex: 2 },
      ],
    };
    const a = await open(browser, `${base}/?v1=${encodeURIComponent(JSON.stringify(comp))}`);
    await a
      .waitForFunction(() => window.__bd_probe.samples.some((x) => x.loaded), null, {
        timeout: 30000,
      })
      .catch(() => {});
    const dflt = (await sampleState(a))[0];
    check(
      "a new Sample starts with v2's default CC0 Freesound sound (v1's default file is gone)",
      dflt.track === 'freesound:223835' && dflt.loaded,
      dflt,
    );
    await a.waitForTimeout(1000);
    await openSamplePanel(a, 0, 2);
    const block = () =>
      a.evaluate(() => {
        const selected = window.__bd_probe.scene.OptionsPanel
          .SelectedBlock as SelectedBlockView | null;
        return {
          results: selected?.SearchResults.length ?? 0,
          searching: selected?.Searching,
          query: selected?.SearchString,
        };
      });
    await a
      .waitForFunction(
        () => {
          const b = window.__bd_probe.scene.OptionsPanel.SelectedBlock as SelectedBlockView | null;
          return b && !b.Searching && b.SearchResults.length > 0;
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    const first = await block();
    // v1's random two-word query can match nothing on real Freesound; the mock always answers
    // (typed search below needs results).
    check(
      "sample panel opens with v1's random search, results from Freesound",
      (remote !== null || first.results > 0) && !!first.query && !first.searching,
      first,
    );
    await a.screenshot({ path: `${OUT}/sample-search.png` });

    // Type a search (Enter submits, as v1's EnterCheck), without reloading the page or playing
    // notes.
    const notesBefore = (await probe(a)).gateOns;
    const [ix, iy] = await a.evaluate(() => {
      const input = document.getElementById('soundCloudSearchInput');
      if (!input) throw new Error('no search field');
      const boundingClientRect = input.getBoundingClientRect();
      return [
        boundingClientRect.left + boundingClientRect.width / 2,
        boundingClientRect.top + boundingClientRect.height / 2,
      ];
    });
    await a.mouse.click(ix, iy);
    await a.keyboard.press('Meta+A');
    await a.keyboard.type(remote ? 'bell' : 'bells');
    await a.keyboard.press('Enter');
    await a.waitForTimeout(300);
    await a
      .waitForFunction(
        () => {
          const b = window.__bd_probe.scene.OptionsPanel.SelectedBlock as SelectedBlockView | null;
          return b && !b.Searching && b.SearchResults.length > 0;
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    const typed = await block();
    check(
      'typed search + Enter searches (no page reload)',
      /^bells?$/i.test(typed.query ?? '') &&
        typed.results > 0 &&
        (await a.evaluate(() => !!window.__bd_probe)),
      typed,
    );
    check('typing in the search box plays no notes', (await probe(a)).gateOns === notesBefore);
    if (!remote) {
      const sr = mockServices().requests.filter((request) =>
        request.path.startsWith('/apiv2/search/text/'),
      );
      check(
        'the Worker searched Freesound with its own key (never the browser)',
        sr.length > 0 &&
          sr.every((request) => request.auth === 'Token test-freesound-key') &&
          sr.some((request) => request.path.includes('query=bells')),
        sr.length,
      );
    }

    // Pick the first result (v1 row 1: 40 units tall from centerY − 98).
    const [rx, ry] = await v1Css(
      a,
      `(s, A, u) => [A.Width / 2, s.scene.SoundcloudPanel.OffsetY + A.Height / 2 - 78 * u]`,
    );
    await a.mouse.move(rx, ry);
    await a.waitForTimeout(100);
    await a.mouse.click(rx, ry);
    await a
      .waitForFunction(
        () =>
          window.__bd_probe.samples.some(
            (x) =>
              x.loaded &&
              typeof x.track === 'string' &&
              x.track.startsWith('freesound:') &&
              x.track !== 'freesound:223835',
          ),
        null,
        { timeout: 30000 },
      )
      .catch(() => {});
    const st = await sampleState(a),
      pa = await probe(a);
    const track = st[0]?.track ?? '';
    const ref = pa.patch.refs?.[track] as FreesoundRef | undefined;
    check(
      'choosing a result loads it into the Sample',
      st.at(0)?.loaded === true && /^freesound:\d+$/.test(track) && track !== 'freesound:223835',
      st,
    );
    check(
      'the patch references it (id, user, licence, preview), no audio',
      ref?.provider === 'freesound' &&
        !!ref.username &&
        ref.license.startsWith('CC') &&
        /^https?:/.test(ref.preview) &&
        JSON.stringify(pa.patch).length < 8000,
      ref,
    );
    check(
      'options panel credits the sound (v1 "By <user>")',
      await a.evaluate(() => {
        const selectedBlock = window.__bd_probe.scene.OptionsPanel
          .SelectedBlock as SelectedBlockView | null;
        return !!selectedBlock?.Params.user && !!selectedBlock.Params.permalink;
      }),
    );
    const hashA = await renderHash(a);
    check('the Sample plays the sound (powered)', hashA.peak > 0.01, hashA);

    // Shared: the recipient fetches the same sound and renders identically.
    await a.mouse.click(1000, 700); // close the options panel (click the stage)
    await a.waitForTimeout(600);
    const url = await shareVia(a, 'generate');
    const id = idOf(url);
    const tok = await editTokenOf(a, id);
    if (id && tok) created.push({ id, token: tok });
    check(
      'share panel: no warning for a Freesound sample',
      await a.evaluate(() => !window.__bd_probe.scene.host.links?.warning()),
    );
    const b = await open(browser, local(url));
    await b
      .waitForFunction(
        (wanted) => window.__bd_probe.samples.some((x) => x.loaded && x.track === wanted),
        track,
        { timeout: 30000 },
      )
      .catch(() => {});
    const hashB = await renderHash(b);
    check(
      'a recipient loads the same Freesound sound and renders identically',
      hashA.hash === hashB.hash,
      { a: hashA, b: hashB },
    );
    await b.context().close();

    // The user's own file, dropped on the Sample: referenced by fingerprint, not portable.
    await closeShare(a);
    await dropFile(a, 0, 2, 'my-loop.wav', sineWav(330));
    await a
      .waitForFunction(
        () => window.__bd_probe.samples.some((x) => x.track === 'file:my-loop.wav' && x.loaded),
        null,
        { timeout: 10000 },
      )
      .catch(() => {});
    const pf = await probe(a);
    const fref = pf.patch.refs?.['file:my-loop.wav'] as FileRef | undefined;
    check(
      'dropping a file on a Sample loads it there',
      (await sampleState(a)).some((x) => x.track === 'file:my-loop.wav' && x.loaded),
      await sampleState(a),
    );
    check(
      'file reference: name, size, duration, sha256 fingerprint',
      fref?.provider === 'file' &&
        fref.bytes > 0 &&
        fref.durationSec > 1.4 &&
        /^sha256:[0-9a-f]{64}$/.test(fref.hash),
      fref,
    );
    check(
      'the unused Freesound ref is dropped from the patch',
      !Object.keys(pf.patch.refs ?? {}).some((k) => k.startsWith('freesound:')),
    );
    await openShare(a);
    await a.screenshot({ path: `${OUT}/share-warning.png` });
    check(
      'share panel warns: a local file is not in the link',
      await a.evaluate(() =>
        (window.__bd_probe.scene.host.links?.warning() ?? '').includes('own audio samples'),
      ),
    );
    await shareVia(a, 'overwrite').catch(() => '');
    const recipient = await open(browser, local(url));
    await recipient.waitForTimeout(2500);
    const cs = await sampleState(recipient);
    check(
      'a recipient sees the file as missing (not loaded, reference kept)',
      cs.length === 1 && !cs[0].loaded && cs[0].track === 'file:my-loop.wav',
      cs,
    );
    await openSamplePanelIfMissingLabel(recipient);
    await recipient.context().close();

    // A file dropped on empty stage makes a new Sample there (v1's planned behaviour).
    const before = (await probe(a)).blocks.length;
    await dropFile(a, 6, -3, 'second.wav', sineWav(550));
    await a
      .waitForFunction(
        () => window.__bd_probe.samples.some((x) => x.track === 'file:second.wav' && x.loaded),
        null,
        { timeout: 10000 },
      )
      .catch(() => {});
    const after = await probe(a);
    check(
      'dropping a file on empty stage creates a Sample holding it',
      after.blocks.length === before + 1 &&
        after.patch.blocks.some(
          (x) =>
            x.type === 'source.sample' &&
            x.x === 6 &&
            x.y === -3 &&
            x.params?.track === 'file:second.wav',
        ),
    );
    await a.context().close();
  },
};

/** The recipient's options panel names the missing file (SPEC-SHARING-BACKEND R13). */
async function openSamplePanelIfMissingLabel(page: Page): Promise<void> {
  const [x, y] = located(
    await page.evaluate(() => {
      const probe = window.__bd_probe;
      const sample = probe.state.blocks.find((block) => block.type === 'source.sample');
      return sample ? probe.blockPoint(sample.id) : null;
    }),
    'the Sample block',
  );
  await page.mouse.click(x, y);
  await page
    .waitForFunction(() => window.__bd_probe.scene.OptionsPanel.Scale === 1, null, {
      timeout: 5000,
    })
    .catch(() => {});
  await page.waitForTimeout(500);
  const label = await page.evaluate(
    () =>
      (window.__bd_probe.scene.OptionsPanel.SelectedBlock as SelectedBlockView | null)?.Params
        .trackName ?? '',
  );
  await page.screenshot({ path: `${OUT}/sample-missing.png` });
  check(
    '… and its options panel says MISSING with the file name',
    label.startsWith('MISSING · MY-LOOP.WAV'),
    label,
  );
}
