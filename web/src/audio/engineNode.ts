// Main-thread side: compile the engine WASM once, load the worklet, create the node.
import { setAudioSession } from './session';
import processorUrl from './processor.ts?worker&url';
import type { Command } from '../engine/wasmEngine.ts';
import type { FromWorklet, ProcessorOptions, Recording, Snapshot, ToWorklet } from './protocol.ts';

let modulePromise: Promise<WebAssembly.Module> | null = null;
export function engineModule(url = new URL('blokdust.wasm', document.baseURI).href): Promise<WebAssembly.Module> {
  modulePromise ??= fetch(url).then(r => { if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`); return r.arrayBuffer(); }).then(b => WebAssembly.compile(b));
  return modulePromise;
}

type EngineOptions = { seed?: number; commands?: Command[]; testInput?: { frequency: number; gain: number } };
const prepared = new WeakMap<BaseAudioContext, Promise<WebAssembly.Module>>();

export class EngineNode {
  readonly node: AudioWorkletNode;
  private constructor(node: AudioWorkletNode) { this.node = node; }

  static async create(ctx: BaseAudioContext, opts: EngineOptions = {}): Promise<EngineNode> {
    return EngineNode.build(ctx, await EngineNode.prepare(ctx), opts);
  }
  /** The slow part, done once per context: load the worklet and compile the WASM. A suspended context (made before any
   * click) can do this, so the web app prepares it while the start screen shows and START has nothing to wait for. */
  static prepare(ctx: BaseAudioContext): Promise<WebAssembly.Module> {
    let p = prepared.get(ctx);
    if (!p) prepared.set(ctx, p = Promise.all([ctx.audioWorklet.addModule(processorUrl), engineModule()]).then(([, m]) => m));
    return p;
  }
  /** The node, from a prepared context: synchronous and quick. */
  static build(ctx: BaseAudioContext, module: WebAssembly.Module, opts: EngineOptions = {}): EngineNode {
    const processorOptions: ProcessorOptions = { module, seed: opts.seed ?? 1, commands: opts.commands ?? [], testInput: opts.testInput };
    // One input (mic/line → Audio In) and a stereo output.
    const node = new AudioWorkletNode(ctx, 'blokdust', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], processorOptions });
    node.connect(ctx.destination);
    return new EngineNode(node);
  }

  /** Look inside Stage block `stage` (CHG-0021): snapshots come from its inner world; 0: back to the outer one. */
  setView(stage: number): void { this.node.port.postMessage({ type: 'view', stage } satisfies ToWorklet); }
  send(commands: Command[]): void { this.node.port.postMessage({ type: 'commands', commands } satisfies ToWorklet); }
  /** `stage`: the block is inside that Stage block (CHG-0021); 0: the outer world. */
  sendSample(id: number, buffer: AudioBuffer, stage = 0): void {
    const left = buffer.getChannelData(0).slice(), right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1).slice() : undefined;
    this.node.port.postMessage({ type: 'sample', id, left, right, sampleRate: buffer.sampleRate, ...(stage ? { stage } : {}) } satisfies ToWorklet, [left.buffer, ...(right ? [right.buffer] : [])]);
  }
  /** Live input for Microphone / Audio In blocks: ask for the microphone once and feed the worklet's input. */
  private input: Promise<void> | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  connectMicrophone(): Promise<void> {
    if (!this.input) setAudioSession('play-and-record');  // iOS: "playback" cannot open the mic
    const asked = this.input ??= navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      .then(stream => {
        if (this.input !== asked) { for (const t of stream.getTracks()) t.stop(); return; }  // let go while it was asked for
        this.stream = stream;
        this.source = (this.node.context as AudioContext).createMediaStreamSource(stream);
        this.source.connect(this.node);
      })
      .catch(err => { console.warn('microphone unavailable:', err); if (this.input === asked) this.input = null; });
    return asked;
  }
  /** No block listens any more (the last Microphone or Audio In is gone): stop the microphone, so the browser no
   * longer shows it in use (owner, 2026-11-17, CHG-0035). Asked for again by the next one. */
  disconnectMicrophone(): void {
    if (!this.input) return;
    this.input = null;
    this.source?.disconnect(); this.source = null;
    for (const t of this.stream?.getTracks() ?? []) t.stop();
    this.stream = null;
    setAudioSession('playback');
  }
  /** Tests: the microphone is open (asked for, or live). */
  get microphoneOpen(): boolean { return !!this.input; }
  /** v1 Recorder: capture the master output; `stop` resolves with what was recorded. */
  private recordingDone: ((r: Recording) => void) | null = null;
  startRecording(): void { this.node.port.postMessage({ type: 'record', on: true } satisfies ToWorklet); }
  stopRecording(): Promise<Recording> {
    return new Promise(res => { this.recordingDone = res; this.node.port.postMessage({ type: 'record', on: false } satisfies ToWorklet); });
  }
  onSnapshot(cb: (s: Snapshot) => void): void {
    this.node.port.onmessage = (e: MessageEvent<FromWorklet>) => {
      if (e.data.type === 'recording') { this.recordingDone?.(e.data); this.recordingDone = null; } else cb(e.data);
    };
  }
}
