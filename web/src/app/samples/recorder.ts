import { encodeWav } from '../../audio/wav.ts';
import { juce } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { atStage, engine } from '../model/engineLink.ts';
import { v1Blocks } from '../model/patchModel.ts';
import { samples, setParams, useBuffer } from './userSamples.ts';
import { scene } from '../scene/scene.ts';

// ---- v1 Recorder (RecorderPanel button): record the master output into the block ----
export async function toggleRecording(id: number): Promise<void> {
  const v1Block = v1Blocks.get(id);
  // Plugin: the processor records its own output and loads the take into the block (as a file the project keeps).
  // v1 Recorder.StartRecording / StopRecording: a one-second line in the message bar each way.
  const say = (on: boolean) => {
    scene.message(on ? 'Started Recording' : 'Stopped Recording', { seconds: 1 });
  };
  if (v1Block && juce) {
    v1Block.IsRecording = !v1Block.IsRecording;
    juce.emitEvent('bd_record', { id, on: v1Block.IsRecording, ...atStage() });
    say(v1Block.IsRecording);
    stage.redraw();
    return;
  }
  if (!v1Block || !engine) return;
  if (!v1Block.IsRecording) {
    v1Block.IsRecording = true;
    engine.startRecording();
    say(true);
    stage.redraw();
    return;
  }
  v1Block.IsRecording = false;
  say(false);
  const recording = await engine.stopRecording();
  stage.redraw();
  if (!recording.left.length) return;
  const buf = new AudioBuffer({
    numberOfChannels: 2,
    length: recording.left.length,
    sampleRate: recording.sampleRate,
  });
  buf.copyToChannel(recording.left as Float32Array<ArrayBuffer>, 0);
  buf.copyToChannel(recording.right as Float32Array<ArrayBuffer>, 1);
  setParams(id, { reverse: false });
  useBuffer(id, buf, 'half', 2); // v1 Recorder.UpdateWaveform: detail 2, loop from half way
}

export function downloadRecording(id: number): void {
  if (juce) {
    juce.emitEvent('bd_reveal', { id, ...atStage() });
    return;
  } // plugin: the take is already a file; show it
  const buf = samples.get(id);
  if (!buf) return; // v1: "This block doesn't have a recording to download yet."
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([encodeWav(buf)], { type: 'audio/wav' }));
  a.download = 'BlokdustRecording.wav'; // v1 Recorder.Filename
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 10000);
}
