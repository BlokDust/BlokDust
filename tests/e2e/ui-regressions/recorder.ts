// ui-regressions: The Recorder block.
import { OUT, blk, browser, maxOver, open, toCss, type RegressionTest } from './harness.ts';
import { waveDrawn } from './samplerPanel.ts';

export const recorderTests: Record<string, RegressionTest> = {
  /** Owner (2026-11-18): v1's message bar said STARTED RECORDING and STOPPED RECORDING (v1 Recorder.StartRecording /
   * StopRecording, one second each); v2 said nothing. */
  async 'recorder-says-started-stopped'(errors) {
    const p = await open(
      browser,
      [blk(1, 'ToneSource', -6, 0), blk(2, 'Power', -9, 0), blk(3, 'Recorder', 6, 4)],
      errors,
    );
    const [bx, by] = await toCss(p, 6, 4),
      [, gy1] = await toCss(p, 6, 5),
      grid = gy1 - by;
    const bar = () =>
      p.evaluate(() => {
        const messagePanel = (window as any).__bd_probe.scene.MessagePanel;
        return messagePanel.Open ? String(messagePanel._Value?.string ?? '') : '';
      });
    await p.mouse.click(bx, by - 3 * grid);
    await p.waitForTimeout(250);
    const started = await bar();
    await p.waitForTimeout(600);
    await p.mouse.click(bx, by - 3 * grid);
    await p.waitForTimeout(250);
    const stopped = await bar();
    await p.close();
    return [
      /started recording/i.test(started) && /stopped recording/i.test(stopped),
      { started, stopped },
    ];
  },
  /** The Recorder's red record button (v1 RecorderPanel, beside the block) records the scene; the recording becomes
   * the Recorder's sample: its waveform shows in the options panel and it plays when powered. */
  async 'recorder-records'(errors) {
    const p = await open(
      browser,
      [blk(1, 'ToneSource', -6, 0), blk(2, 'Power', -9, 0), blk(3, 'Recorder', 6, 4)],
      errors,
    );
    const [bx, by] = await toCss(p, 6, 4),
      [, gy1] = await toCss(p, 6, 5),
      grid = gy1 - by;
    const button: [number, number] = [bx, by - 3 * grid]; // v1 RecorderPanel: y − w/2 − h/2, w = h = 3 grid
    await p.mouse.click(...button);
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/recorder-recording.png` });
    await p.mouse.click(...button);
    await p.waitForTimeout(800);
    const [rx, ry] = await toCss(p, 6, 4.5);
    await p.mouse.click(rx, ry);
    await p.waitForTimeout(1200); // open its options panel
    const wave = await waveDrawn(p);
    await p.screenshot({ path: `${OUT}/recorder-recorded.png` });
    await p.mouse.click(1233, 480);
    await p.waitForTimeout(800); // close the panel (click empty stage)
    // Silence the scene (Power → bin), then hold the Recorder: it plays what it recorded. (Opening the panel moved
    // the stage, v1 Jump: positions are read again.)
    const [px, py] = await toCss(p, -9, 0.2);
    await p.mouse.move(px, py);
    await p.mouse.down();
    await p.mouse.move(900, 650, { steps: 6 });
    await p.mouse.move(1232, 754, { steps: 6 });
    await p.waitForTimeout(300);
    await p.mouse.up();
    await p.waitForTimeout(1500);
    const quiet = await maxOver(p, 'rms', 300);
    const [hx, hy] = await toCss(p, 6, 4.5);
    await p.mouse.move(hx, hy);
    await p.mouse.down();
    const playing = await maxOver(p, 'rms', 800);
    await p.mouse.up();
    await p.close();
    return [
      wave > 0 && quiet < 1e-3 && playing > 0.005,
      { recordedWaveformPoints: wave, quietBefore: quiet, holdingRecorder: playing },
    ];
  },
};
