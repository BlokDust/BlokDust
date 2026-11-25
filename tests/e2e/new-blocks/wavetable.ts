// The Wavetable block (CHG-0031), run by tests/e2e/new-blocks.ts.
import {
  OUT,
  blk,
  browser,
  menuItems,
  open,
  openPanel,
  rows,
  state,
  type Tests,
  savedParams,
  setParam,
} from './harness.ts';

export const wavetableTests: Tests = {
  // CHG-0031 (SPEC-AUDIO-WAVETABLE R7): the Wavetable is in the Source menu and sounds; its panel
  // draws the frame it plays, which changes with Table and follows an LFO moving Position.
  async wavetable(errors) {
    const page = await open(
      browser,
      [
        blk('w', 'source.wavetable', 0, 0, { table: 0, position: 0.2 }),
        blk('pw', 'power.power', -3, 0),
        blk('l', 'fx.lfo', 3, 0, { target: 'w:position', rate: 2, depth: 1 }),
      ],
      errors,
    );
    const inMenu = (await menuItems(page, 'Source')).includes('Wavetable');
    const sounding = (await state(page)).rms > 0.001;
    await openPanel(page, 'w');
    await page.waitForTimeout(300);
    const r1 = await rows(page);
    const names = r1.map((row) => row.name);
    const pic1 = r1.find((row) => row.setting === 'wavePicture')?.shown as
      { table: string; position: number; drawn: boolean; first: number[] } | undefined;
    await page.screenshot({ path: `${OUT}/wavetable-panel.png` });
    await page.waitForTimeout(170); // the LFO moves Position: the picture follows
    const pic2 = (await rows(page)).find((row) => row.setting === 'wavePicture')
      ?.shown as typeof pic1;
    await setParam(page, 'table', 6);
    await page.waitForTimeout(300);
    const pic3 = (await rows(page)).find((row) => row.setting === 'wavePicture')
      ?.shown as typeof pic1;
    const table = (await savedParams(page, 'w')).table;
    await page.close();
    const phone = await open(
      browser,
      [blk('w', 'source.wavetable', 0, 0, { table: 2, position: 0.6 })],
      errors,
      {},
      { width: 390, height: 844 },
    );
    await openPanel(phone, 'w');
    await phone.screenshot({ path: `${OUT}/wavetable-panel-phone.png` });
    await phone.close();
    const pass =
      inMenu &&
      sounding &&
      ['Wave', 'Table', 'Position', 'Note', 'Fine'].every((name) => names.includes(name)) &&
      !!pic1?.drawn &&
      pic1.table === 'BELL' &&
      !!pic2 &&
      pic2.position !== pic1.position &&
      pic3?.table === 'SYNC' &&
      table === 6;
    return [
      pass,
      {
        inMenu,
        sounding,
        names,
        pic1: pic1 && { ...pic1, first: undefined },
        moved: pic2?.position,
        pic3: pic3?.table,
        table,
      },
    ];
  },
};
