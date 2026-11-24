// Notes: the computer keyboard and Web MIDI play Keyboard and MIDI Input blocks.
import { CommandType, type Command } from '../../engine/wasmEngine.ts';
import { MpeParser } from '../../input/mpe.ts';
import { type MidiDevice, attachNoteInputs } from '../../input/keys.ts';
import { track } from '../../analytics/client.ts';
import { juce, usage } from '../boot/page.ts';
import { sendRaw, standalone } from '../model/engineLink.ts';
import { model, typeIndex } from '../model/patchModel.ts';
import { innerIds, inside, macros } from '../model/stageWorlds.ts';
import { scene } from '../scene/scene.ts';

// ---- notes: computer keyboard → input.computer-keyboard blocks, Web MIDI → input.midi-controller blocks ----
export let keyboardType!: number;
export let midiType!: number;

// To the outer world, which passes them into every Stage: a Keyboard inside one plays from outside it (owner, 2026-11-14).
export const note = (blockType: number, n: number, down: boolean, velocity = 1) =>
  sendRaw([
    {
      type: down ? CommandType.NoteOn : CommandType.NoteOff,
      id: 0,
      blockType,
      param: n,
      value: velocity,
    },
  ]);

// Web MIDI → each MIDI Input block through its own MPE/MIDI parser (PLUGIN-0004): its device choice here, its
// channel filter and expression mapping in the engine.
export const parsers = new Map<string, MpeParser>();

// by "<stage>:<block id>" (0: the outer world)
export let midiDevices: MidiDevice[] = [];

export function init(): void {
  keyboardType = typeIndex('input.computer-keyboard');
  midiType = typeIndex('input.midi-controller');
  attachNoteInputs({
    key: (n, down) => {
      if (down && !usage.keys) {
        usage.keys = true;
        track('keyboard_played');
      }
      note(keyboardType, n, down);
    },
    // Plugin: with a Computer Keyboard in the patch its keys are BlokDust's while the editor has the keys (the DAW's
    // shortcuts would fire too); without one they go on to the DAW (Logic's Musical Typing → MIDI Input).
    captureKeys: () =>
      !!juce && [...model.values()].some((b) => b.type === 'input.computer-keyboard'),
    captureAll: () => standalone,
    // Plugin: the editor says when its window loses the keys (clicking into the DAW); the web view may not blur (Ableton).
    onReleaseAll: (release) => {
      juce?.addEventListener('bd_keysLost', () => release());
    },
    midi: (status, d1, d2, device) => {
      // Every MIDI Input: those on show, and those inside the outer world's Stage blocks (they play from outside too).
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
          const id = b.id === undefined ? undefined : ids[b.id];
          if (b.type === 'input.midi-controller' && id !== undefined)
            inputs.push({ key: `${sid}:${id}`, id, params: b.params ?? {}, stage: sid });
        }
      }
      const cmds: Command[] = [];
      for (const { key, id, params: q, stage: sid } of inputs) {
        const want = typeof q.device === 'string' ? q.device : '';
        if (want && want !== device.name) continue;
        let p = parsers.get(key);
        if (!p) {
          p = new MpeParser(id, midiType);
          parsers.set(key, p);
        }
        if (!usage.midi) {
          usage.midi = true;
          track('midi_connected', { mpe: q.mpe ? 'yes' : 'no' });
        }
        p.setSettings({
          mpe: !!q.mpe,
          memberBendRange: typeof q.bendRange === 'number' ? q.bendRange : 48,
        });
        const out: Command[] = [];
        p.message(status, d1, d2, -1, out);
        cmds.push(...(sid ? out.map((c) => ({ ...c, stage: sid })) : out));
      }
      const live = new Set(inputs.map((i) => i.key));
      for (const key of parsers.keys()) if (!live.has(key)) parsers.delete(key);
      if (cmds.length) sendRaw(cmds);
    },
    devices: (list) => {
      midiDevices = list;
      scene.setMidiDevices?.(list);
    },
  });
  (window as unknown as { __bd_midiDevices: () => MidiDevice[] }).__bd_midiDevices = () =>
    midiDevices;
}
