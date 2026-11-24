// Notes: the computer keyboard and Web MIDI play Keyboard and MIDI Input blocks.
import { usage } from '../boot/sessionAnalytics.ts';
import { CommandType, type Command } from '../../engine/wasmEngine.ts';
import { MpeParser } from '../../input/mpe.ts';
import { type MidiDevice, attachNoteInputs } from '../../input/keys.ts';
import { track } from '../../analytics/client.ts';
import { juce } from '../boot/page.ts';
import { sendRaw, standalone } from '../model/engineLink.ts';
import { model, typeIndex } from '../model/patchModel.ts';
import { innerIds, inside, macros } from '../model/stageWorlds.ts';
import { scene } from '../scene/scene.ts';

/** Browser-test hooks. */
declare global {
  interface Window {
    __bd_midiDevices: () => MidiDevice[];
  }
}

// ---- notes: computer keyboard → input.computer-keyboard blocks, Web MIDI → input.midi-controller
// blocks ----
export let keyboardType!: number;
export let midiType!: number;

// To the outer world, which passes them into every Stage: a Keyboard inside one plays from outside
// it (owner, 2026-11-14).
export const note = (blockType: number, midiNote: number, down: boolean, velocity = 1) =>
  sendRaw([
    {
      type: down ? CommandType.NoteOn : CommandType.NoteOff,
      id: 0,
      blockType,
      param: midiNote,
      value: velocity,
    },
  ]);

// Web MIDI → each MIDI Input block through its own MPE/MIDI parser (PLUGIN-0004): its device choice
// here, its channel filter and expression mapping in the engine.
export const parsers = new Map<string, MpeParser>();

// by "<stage>:<block id>" (0: the outer world)
export let midiDevices: MidiDevice[] = [];

export function init(): void {
  keyboardType = typeIndex('input.computer-keyboard');
  midiType = typeIndex('input.midi-controller');
  attachNoteInputs({
    key: (midiNote, down) => {
      if (down && !usage.keys) {
        usage.keys = true;
        track('keyboard_played');
      }
      note(keyboardType, midiNote, down);
    },
    // Plugin: with a Computer Keyboard block, keys are BlokDust's while the editor has focus (or
    // the DAW's shortcuts fire too); without one they go to the DAW (Logic's Musical Typing).
    captureKeys: () =>
      !!juce && [...model.values()].some((b) => b.type === 'input.computer-keyboard'),
    captureAll: () => standalone,
    // Plugin: the editor says when its window loses the keys (clicking into the DAW); the web view
    // may not blur (Ableton).
    onReleaseAll: (release) => {
      juce?.addEventListener('bd_keysLost', () => {
        release();
      });
    },
    midi: (status, d1, d2, device) => {
      // Every MIDI Input: those on show, and those inside the outer world's Stage blocks (they play
      // from outside too).
      const inputs: { key: string; id: number; params: Record<string, unknown>; stage: number }[] =
        [];
      for (const [id, b] of model)
        if (b.type === 'input.midi-controller')
          inputs.push({
            key: `${inside?.stageId ?? 0}:${id}`,
            id,
            params: b.params,
            stage: inside?.stageId ?? 0,
          });
      if (inside)
        for (const [id, b] of inside.outer.model)
          if (b.type === 'input.midi-controller')
            inputs.push({ key: `0:${id}`, id, params: b.params, stage: 0 });
      for (const [sid, st] of inside ? inside.outer.model : model) {
        if (st.type !== 'source.stage' || sid === inside?.stageId) continue;
        const ids = innerIds.get(st.uid)?.ids ?? {};
        for (const b of macros.get(st.uid)?.blocks ?? []) {
          const id = Object.hasOwn(ids, b.id) ? ids[b.id] : undefined;
          if (b.type === 'input.midi-controller' && id !== undefined)
            inputs.push({ key: `${sid}:${id}`, id, params: b.params ?? {}, stage: sid });
        }
      }
      const cmds: Command[] = [];
      for (const { key, id, params, stage: sid } of inputs) {
        const want = typeof params.device === 'string' ? params.device : '';
        if (want && want !== device.name) continue;
        let parser = parsers.get(key);
        if (!parser) {
          parser = new MpeParser(id, midiType);
          parsers.set(key, parser);
        }
        if (!usage.midi) {
          usage.midi = true;
          track('midi_connected', { mpe: params.mpe ? 'yes' : 'no' });
        }
        parser.setSettings({
          mpe: !!params.mpe,
          memberBendRange: typeof params.bendRange === 'number' ? params.bendRange : 48,
        });
        const out: Command[] = [];
        parser.message(status, d1, d2, -1, out);
        cmds.push(...(sid ? out.map((command) => ({ ...command, stage: sid })) : out));
      }
      const live = new Set(inputs.map((i) => i.key));
      for (const key of parsers.keys()) if (!live.has(key)) parsers.delete(key);
      if (cmds.length) sendRaw(cmds);
    },
    devices: (list) => {
      midiDevices = list;
      scene.setMidiDevices(list);
    },
  });
  window.__bd_midiDevices = () => midiDevices;
}
