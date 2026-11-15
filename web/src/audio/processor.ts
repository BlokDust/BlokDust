// AudioWorkletProcessor hosting the WASM engine. Instantiates synchronously from a module compiled on the main thread.
/// <reference path="./worklet.d.ts" />
import { EventType, WasmEngine, type EngineEvent } from '../engine/wasmEngine.ts';
import type { ProcessorOptions, Snapshot, ToWorklet } from './protocol.ts';

const UI_EVENTS = new Set<number>([EventType.Hit, EventType.GateOn, EventType.GateOff, EventType.Connect, EventType.Disconnect, EventType.Logic]);

class BlokdustProcessor extends AudioWorkletProcessor {
  private readonly engine: WasmEngine;
  private readonly snapshotEvery: number;
  private quanta = 0;
  private frame = 0;
  private sumSq = 0;
  private count = 0;
  private pending: EngineEvent[] = [];
  private topologyDirty = true;
  /** The Stage block whose inner world the page is looking at (0: the outer world). Its connections go with every
   * snapshot: the outer world's events do not say when they change. */
  private viewing = 0;
  private readonly testInput?: { frequency: number; gain: number };

  constructor(options: AudioWorkletNodeOptions) {
    super(options);
    const opts = options.processorOptions as ProcessorOptions;
    this.engine = WasmEngine.fromModule(opts.module, sampleRate, opts.seed);
    this.testInput = opts.testInput;
    for (const c of opts.commands) this.engine.push(c);
    this.snapshotEvery = Math.max(1, Math.round(sampleRate / 128 / 60));  // ~60 snapshots per second
    this.port.onmessage = (e: MessageEvent<ToWorklet>) => {
      const m = e.data;
      if (m.type === 'commands') for (const c of m.commands) this.engine.push(c);
      else if (m.type === 'sample') this.engine.attachSample(m.id, m.left, m.right, m.sampleRate, m.stage ?? 0);
      else if (m.type === 'view') { this.engine.setView(m.stage); this.viewing = m.stage; this.topologyDirty = true; }
      else if (m.type === 'record') {
        if (m.on) this.recorded = [];
        else if (this.recorded) {
          const total = this.recorded.reduce((a, c) => a + c[0].length, 0), l = new Float32Array(total), r = new Float32Array(total);
          let at = 0;
          for (const [a, b] of this.recorded) { l.set(a, at); r.set(b, at); at += a.length; }
          this.recorded = null;
          this.port.postMessage({ type: 'recording', left: l, right: r, sampleRate }, [l.buffer, r.buffer]);
        }
      }
    };
  }

  /** Master output blocks while a Recorder records (v1 RecorderJS taps App.Audio.Master). */
  private recorded: [Float32Array, Float32Array][] | null = null;

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const out = outputs[0];
    const n = out[0].length;
    const live = inputs[0];  // mic / line input for Audio In, when the node has one connected
    const { left, right } = this.testInput
      ? this.engine.processTestSine(n, this.frame, sampleRate, this.testInput.frequency, this.testInput.gain)
      : live && live.length ? this.engine.process(n, { left: live[0], right: live[1] }) : this.engine.process(n);
    out[0].set(left);
    if (out[1]) out[1].set(right);
    if (this.recorded) this.recorded.push([left.slice(), right.slice()]);
    for (let i = 0; i < n; i++) this.sumSq += left[i] * left[i];
    this.count += n;
    this.frame += n;
    for (const ev of this.engine.drainEvents()) {  // drain every quantum so the engine log never fills
      if (ev.type === EventType.Connect || ev.type === EventType.Disconnect) this.topologyDirty = true;
      if (UI_EVENTS.has(ev.type)) this.pending.push(ev);
    }
    if (++this.quanta % this.snapshotEvery === 0) this.postSnapshot();
    return true;
  }

  private postSnapshot() {
    const particles = this.engine.particles();
    const powered = this.engine.powered();
    const beams = this.engine.beams();
    const playheads = this.engine.playheads();
    const monitors = this.engine.monitors();
    const snap: Snapshot = { type: 'snapshot', frame: this.frame, particles, beams, powered, playheads, monitors, events: this.pending, rms: Math.sqrt(this.sumSq / Math.max(1, this.count)) };
    const transfer: Transferable[] = [particles.buffer, powered.buffer, beams.buffer, playheads.buffer, monitors.buffer];
    if (this.topologyDirty || this.viewing) { snap.connections = this.engine.connections(); transfer.push(snap.connections.buffer); this.topologyDirty = false; }
    this.port.postMessage(snap, transfer);
    this.pending = []; this.sumSq = 0; this.count = 0;
  }
}

registerProcessor('blokdust', BlokdustProcessor);
