// AudioWorkletProcessor hosting the WASM engine. Instantiates synchronously from a module compiled
// on the main thread. / <reference path="./worklet.d.ts" />
import { EventType, WasmEngine, type EngineEvent } from '../engine/wasmEngine.ts';
import type { ProcessorOptions, Snapshot, ToWorklet } from './protocol.ts';

const UI_EVENTS = new Set<number>([
  EventType.Hit,
  EventType.GateOn,
  EventType.GateOff,
  EventType.Connect,
  EventType.Disconnect,
  EventType.Logic,
]);

class BlokdustProcessor extends AudioWorkletProcessor {
  private readonly engine: WasmEngine;
  private readonly snapshotEvery: number;
  private quanta = 0;
  private frame = 0;
  private sumSq = 0;
  /** Emit events since the last snapshot: only their number goes to the page (R16). */
  private emitted = 0;
  private count = 0;
  private pending: EngineEvent[] = [];
  private topologyDirty = true;
  /** The Stage block whose inner world the page is looking at (0: the outer world). Its connections
   * go with every snapshot: the outer world's events do not say when they change. */
  private viewing = 0;
  private readonly testInput?: { frequency: number; gain: number };

  constructor(options: AudioWorkletNodeOptions) {
    super(options);
    const opts = options.processorOptions as ProcessorOptions;
    this.engine = WasmEngine.fromModule(opts.module, sampleRate, opts.seed);
    this.testInput = opts.testInput;
    for (const command of opts.commands) this.engine.push(command);
    this.snapshotEvery = Math.max(1, Math.round(sampleRate / 128 / 60)); // ~60 snapshots per second
    this.port.onmessage = (event: MessageEvent<ToWorklet>) => {
      const message = event.data;
      if (message.type === 'commands')
        for (const command of message.commands) this.engine.push(command);
      else if (message.type === 'sample')
        this.engine.attachSample(
          message.id,
          message.left,
          message.right,
          message.sampleRate,
          message.stage ?? 0,
        );
      else if (message.type === 'view') {
        this.engine.setView(message.stage);
        this.viewing = message.stage;
        this.topologyDirty = true;
      } else {
        // 'record'
        if (message.on) this.recorded = [];
        else if (this.recorded) {
          const total = this.recorded.reduce((a, chunk) => a + chunk[0].length, 0),
            samples = new Float32Array(total),
            rightSamples = new Float32Array(total);
          let at = 0;
          for (const [a, b] of this.recorded) {
            samples.set(a, at);
            rightSamples.set(b, at);
            at += a.length;
          }
          this.recorded = null;
          this.port.postMessage(
            { type: 'recording', left: samples, right: rightSamples, sampleRate },
            [samples.buffer, rightSamples.buffer],
          );
        }
      }
    };
  }

  /** Master output blocks while a Recorder records (v1 RecorderJS taps App.Audio.Master). */
  private recorded: [Float32Array, Float32Array][] | null = null;

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const out = outputs[0];
    const lengthValue = out[0].length;
    const live = inputs.at(0); // mic / line input for Audio In, when the node has one connected
    const { left, right } = this.testInput
      ? this.engine.processTestSine(
          lengthValue,
          this.frame,
          sampleRate,
          this.testInput.frequency,
          this.testInput.gain,
        )
      : live?.length
        ? this.engine.process(lengthValue, { left: live[0], right: live[1] })
        : this.engine.process(lengthValue);
    out[0].set(left);
    if (out[1]) out[1].set(right);
    if (this.recorded) this.recorded.push([left.slice(), right.slice()]);
    for (let i = 0; i < lengthValue; i++) this.sumSq += left[i] * left[i];
    this.count += lengthValue;
    this.frame += lengthValue;
    for (const ev of this.engine.drainEvents()) {
      // drain every quantum so the engine log never fills
      if (ev.type === EventType.Emit) {
        this.emitted++;
        continue;
      }
      if (ev.type === EventType.Connect || ev.type === EventType.Disconnect)
        this.topologyDirty = true;
      // A Toggle flipped by a hit: its new state goes with the event, so the patch the page saves
      // keeps it (CHG-0013).
      if (ev.type === EventType.Logic) ev.value = this.engine.param(ev.block, 0);
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
    const snap: Snapshot = {
      type: 'snapshot',
      frame: this.frame,
      particles,
      beams,
      powered,
      playheads,
      monitors,
      events: this.pending,
      emitted: this.emitted,
      rms: Math.sqrt(this.sumSq / Math.max(1, this.count)),
    };
    const transfer: Transferable[] = [
      particles.buffer,
      powered.buffer,
      beams.buffer,
      playheads.buffer,
      monitors.buffer,
    ];
    if (this.topologyDirty || this.viewing) {
      snap.connections = this.engine.connections();
      transfer.push(snap.connections.buffer);
      this.topologyDirty = false;
    }
    this.port.postMessage(snap, transfer);
    this.pending = [];
    this.emitted = 0;
    this.sumSq = 0;
    this.count = 0;
  }
}

registerProcessor('blokdust', BlokdustProcessor);
