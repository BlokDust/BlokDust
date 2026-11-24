// Test harness page: render a golden fixture through the real AudioWorklet + WASM path and hash the output.
import { EngineNode } from './audio/engineNode.ts';
import { hashAudio, hashStereo, hex } from './engine/wasmEngine.ts';
import { loadPatch, type Patch, type ScriptOp } from './patch/loadPatch.ts';

interface Fixture {
  render?: { seconds?: number; sampleRate?: number };
  input?: { frequency?: number; gain?: number };
  patch: Patch;
  script?: ScriptOp[];
}

async function renderGolden(fx: Fixture): Promise<{ audioHash: string; frames: number }> {
  const sr = fx.render?.sampleRate ?? 48000;
  const frames = Math.round((fx.render?.seconds ?? 5) * sr);
  const loaded = loadPatch(fx.patch, fx.script ?? []);
  const ctx = new OfflineAudioContext(2, frames, sr);
  const testInput = fx.input
    ? { frequency: fx.input.frequency ?? 440, gain: fx.input.gain ?? 0.25 }
    : undefined;
  await EngineNode.create(ctx, { seed: loaded.seed, commands: loaded.commands, testInput });
  const buf = await ctx.startRendering();
  return {
    audioHash: hex(hashStereo(hashAudio(buf.getChannelData(0)), hashAudio(buf.getChannelData(1)))),
    frames,
  };
}

(window as unknown as { renderGolden: typeof renderGolden }).renderGolden = renderGolden;
document.title += ' (ready)';
