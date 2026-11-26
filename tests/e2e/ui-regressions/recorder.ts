// ui-regressions: The Recorder block.
import { OUT, blk, browser, maxOver, open, toCss, type RegressionTest } from './harness.ts';
import { waveDrawn } from './samplerPanel.ts';
import type { MessagePanelText } from './v1Views.ts';

export const recorderTests: Record<string, RegressionTest> = {
  /** v1's message bar says STARTED RECORDING and STOPPED RECORDING, one second each (v1
   * Recorder.StartRecording / StopRecording); v2 said nothing. */
  async 'recorder-says-started-stopped'(errors) {
    const page = await open(
      browser,
      [blk(1, 'ToneSource', -6, 0), blk(2, 'Power', -9, 0), blk(3, 'Recorder', 6, 4)],
      errors,
    );
    const [bx, by] = await toCss(page, 6, 4),
      [, gy1] = await toCss(page, 6, 5),
      grid = gy1 - by;
    const bar = () =>
      page.evaluate(() => {
        const messagePanel = window.__bd_probe.scene.MessagePanel as unknown as MessagePanelText;
        return messagePanel.Open ? (messagePanel._Value?.string ?? '') : '';
      });
    await page.mouse.click(bx, by - 3 * grid);
    await page.waitForTimeout(250);
    const started = await bar();
    await page.waitForTimeout(600);
    await page.mouse.click(bx, by - 3 * grid);
    await page.waitForTimeout(250);
    const stopped = await bar();
    await page.close();
    return [
      /started recording/i.test(started) && /stopped recording/i.test(stopped),
      { started, stopped },
    ];
  },
  /** The Recorder's red button (v1 RecorderPanel) records the scene into the Recorder's sample: its
   * waveform shows in the options panel and it plays when powered. */
  async 'recorder-records'(errors) {
    const page = await open(
      browser,
      [blk(1, 'ToneSource', -6, 0), blk(2, 'Power', -9, 0), blk(3, 'Recorder', 6, 4)],
      errors,
    );
    const [bx, by] = await toCss(page, 6, 4),
      [, gy1] = await toCss(page, 6, 5),
      grid = gy1 - by;
    // v1 RecorderPanel: y − w/2 − h/2, w = h = 3 grid
    const button: [number, number] = [bx, by - 3 * grid];
    await page.mouse.click(...button);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/recorder-recording.png` });
    await page.mouse.click(...button);
    await page.waitForTimeout(800);
    const [rx, ry] = await toCss(page, 6, 4.5);
    await page.mouse.click(rx, ry);
    await page.waitForTimeout(1200); // open its options panel
    const wave = await waveDrawn(page);
    await page.screenshot({ path: `${OUT}/recorder-recorded.png` });
    await page.mouse.click(1233, 480);
    await page.waitForTimeout(800); // close the panel (click empty stage)
    // Silence the scene (Power → bin), then hold the Recorder: it plays what it recorded. The open
    // panel moved the stage (v1 Jump), so positions are read again.
    const [px, py] = await toCss(page, -9, 0.2);
    await page.mouse.move(px, py);
    await page.mouse.down();
    await page.mouse.move(900, 650, { steps: 6 });
    await page.mouse.move(1232, 754, { steps: 6 });
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.waitForTimeout(1500);
    const quiet = await maxOver(page, 'rms', 300);
    const [hx, hy] = await toCss(page, 6, 4.5);
    await page.mouse.move(hx, hy);
    await page.mouse.down();
    const playing = await maxOver(page, 'rms', 800);
    await page.mouse.up();
    await page.close();
    return [
      wave > 0 && quiet < 1e-3 && playing > 0.005,
      { recordedWaveformPoints: wave, quietBefore: quiet, holdingRecorder: playing },
    ];
  },
};
