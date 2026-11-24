// Commands to the engine (or the plugin's processor) for the world on show.
import type { EngineNode } from '../../audio/engineNode.ts';
import { type Command } from '../../engine/wasmEngine.ts';
import { juce } from '../boot/page.ts';
import { inside } from './stageWorlds.ts';

export let engine: EngineNode | null = null;

/** The plugin runs as the standalone app (the processor says so with its patch): no DAW to pass keys on to. */
export let standalone = false;

/** The plugin runs on iPad (CHG-0025): no Trash. */
export let ios = false;

/** Run once START has started audio and the stage shows (panels opened before it never slide in). */
export const afterStart: (() => void)[] = [];

/** Commands to the engine (the plugin: to its processor), as given. */
export let sendRaw = (cmds: Command[]) => engine?.send(cmds);

/** Commands for the world on screen: inside a Stage, they go to its inner world. */
export const send = (cmds: Command[]) =>
  sendRaw(inside ? cmds.map((command) => ({ ...command, stage: inside!.stageId })) : cmds);

/** Which world the snapshots come from: Stage block `id`'s inner world, or 0 for the outer one (the plugin: its
 * processor, CHG-0038). */
export const viewWorld = (id: number) => {
  engine?.setView(id);
  juce?.emitEvent('bd_stageView', { stage: id });
};

/** Plugin messages about a block name the world it is in: `stage` while looking into a Stage (CHG-0038). */
export const atStage = () => (inside ? { stage: inside.stageId } : {});

/** Audio to block `id` in the world on show. */
export const sendSample = (id: number, buffer: AudioBuffer) =>
  engine?.sendSample(id, buffer, inside?.stageId ?? 0);

export function setSendRaw<Value extends typeof sendRaw>(value: Value): Value {
  sendRaw = value;
  return value;
}

export function setStandalone<Value extends typeof standalone>(value: Value): Value {
  standalone = value;
  return value;
}

export function setIos<Value extends typeof ios>(value: Value): Value {
  ios = value;
  return value;
}

export function setEngine<Value extends typeof engine>(value: Value): Value {
  engine = value;
  return value;
}
