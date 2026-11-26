// The patch rendered offline with the WASM engine: same patch and samples, same hash (CHG-0003).
import { engineModule } from '../../audio/engineNode.ts';
import { hashAudio, hashStereo, hex, WasmEngine } from '../../engine/wasmEngine.ts';
import { engineCommands } from '../engine/engineCommands.ts';
import { model, seed } from '../model/patchModel.ts';
import { innerIds, innerSamples } from '../model/stageWorlds.ts';
import { samples } from '../samples/userSamples.ts';

const QUANTUM = 128;

function attach(engine: WasmEngine, id: number, buffer: AudioBuffer, stageId?: number): void {
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : undefined;
  engine.attachSample(id, buffer.getChannelData(0), right, buffer.sampleRate, stageId);
}

/** Samples attach after the first quantum, as live: blocks exist from its first tick. */
function attachSamples(engine: WasmEngine): void {
  for (const [id, buffer] of samples) if (model.has(id)) attach(engine, id, buffer);
  for (const [stageId, block] of model) {
    if (block.type !== 'source.stage') continue;
    for (const [uid, buffer] of innerSamples.get(block.uid) ?? []) {
      const innerId = innerIds.get(block.uid)?.ids[uid];
      if (innerId !== undefined) attach(engine, innerId, buffer, stageId);
    }
  }
}

export async function renderHash(seconds = 4, sampleRate = 48000) {
  const engine = WasmEngine.fromModule(await engineModule(), sampleRate, seed);
  try {
    for (const command of engineCommands()) engine.push(command);
    const frames = Math.round(seconds * sampleRate);
    const left = new Float32Array(frames);
    const right = new Float32Array(frames);
    for (let at = 0; at < frames; at += QUANTUM) {
      const out = engine.process(Math.min(QUANTUM, frames - at));
      left.set(out.left, at);
      right.set(out.right, at);
      if (at === 0) attachSamples(engine);
    }
    let peak = 0;
    for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    return { hash: hex(hashStereo(hashAudio(left), hashAudio(right))), peak };
  } finally {
    engine.dispose();
  }
}
