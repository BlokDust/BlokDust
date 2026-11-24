// What is inside each Stage block (CHG-0021): macros, ids and audio per inner world.
import { type Macro, type PatchBlock, loadPatch } from '../../patch/loadPatch.ts';
import type { V1Block } from '../../v1ui/blocks.ts';
import { type Label } from '../../stage/labels.ts';
import { type Command, CommandType } from '../../engine/wasmEngine.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import {
  isDeadDefault,
  DEFAULT_SOUNDS,
  fetchFreesound,
  refKey,
  openRemembered,
} from '../../patch/samples.ts';
import { listen, needsInput } from '../audio/microphone.ts';
import { juce } from '../boot/page.ts';
import { engine, sendRaw } from './engineLink.ts';
import { type ModelBlock, connectionOrder, labels, model, refs, toPatch } from './patchModel.ts';
import { currentView } from './view.ts';
import { generateBuffer } from '../samples/sampleGen.ts';
import { SAMPLERS } from '../samples/userSamples.ts';

/**
 * Stage blocks (CHG-0021, SCOPE-0006). `macros`: what is inside each, by the Stage block's patch id.
 * `innerIds`: the engine ids its inner blocks have in this session. `inside`: the Stage being looked into; the page
 * then shows and edits its inner world, the outer world's blocks set aside (the engine runs both all along).
 */
export const macros = new Map<string, Macro>();

export const innerIds = new Map<string, { ids: Record<string, number>; nextId: number }>();

/** The audio of samplers inside each Stage (by the Stage's and the block's patch ids): sent to its inner world when it
 * is built, and shown when it is looked into (owner, 2026-11-14: every block can go inside). */
export const innerSamples = new Map<string, Map<string, AudioBuffer>>();

/** How many times each Stage's inner world has been built: audio that arrives for an older one is dropped. */
export const stageBuilds = new Map<string, number>();

export interface Outer {
  model: Map<number, ModelBlock>;
  v1Blocks: Map<number, V1Block>;
  samples: Map<number, AudioBuffer>;
  missing: Set<number>;
  labels: Label[];
  connectionOrder: [string, string][];
  nextId: number;
  view: { x: number; y: number; zoom: number };
  undo: unknown[];
  redo: unknown[];
}

export let inside: {
  stageId: number;
  stageUid: string;
  outer: Outer;
  image: HTMLCanvasElement;
  blockX: number;
  blockY: number;
  grid: number;
} | null = null;

/** The plugin's processor keeps the DAW project's patch: what is inside each Stage goes to it when that changes. */
export let sentMacros = '[]',
  macrosTimer: ReturnType<typeof setTimeout> | undefined;

export const syncMacros = () => {
  if (!juce) return;
  clearTimeout(macrosTimer);
  macrosTimer = setTimeout(() => {
    const ms = JSON.stringify(toPatch().macros ?? []);
    if (ms !== sentMacros) {
      sentMacros = ms;
      juce?.emitEvent('bd_macros', { macros: JSON.parse(ms) });
    }
  }, 50);
};

/** The world on screen as patch parts: its blocks, their connection order, its labels. */
export const worldParts = (
  m: Map<number, ModelBlock> = model,
  order = connectionOrder,
  lbls = labels,
) => {
  const uids = new Set([...m.values()].map((b) => b.uid));
  return {
    blocks: [...m.values()].map((b) => ({
      id: b.uid,
      type: b.type,
      x: b.x,
      y: b.y,
      params: b.params,
    })) as PatchBlock[],
    order: order.filter(([a, b]) => uids.has(a) && uids.has(b)),
    labels: lbls,
  };
};

/** What is inside the Stage being looked into, as it is now. */
export const innerMacro = (): Macro => {
  const w = worldParts();
  return {
    block: inside!.stageUid,
    blocks: w.blocks,
    ...(w.order.length ? { connectionOrder: w.order } : {}),
    ...(w.labels.length ? { labels: w.labels.map((label) => ({ ...label })) } : {}),
    view: currentView(),
  };
};

/** Engine commands that build what is inside Stage block `id` (patch id `uid`), remembering its inner blocks' ids. */
export function stageCommands(id: number, uid: string): Command[] {
  const macro = macros.get(uid),
    blocks = (macro?.blocks ?? []).filter((b) => BLOCKS_BY_ID.has(b.type));
  if (!blocks.length) return [];
  try {
    const loaded = loadPatch({ blocks, connectionOrder: macro!.connectionOrder });
    innerIds.set(uid, { ids: Object.fromEntries(loaded.ids), nextId: loaded.nextId });
    const keyOf = new Map([...loaded.ids].map(([k, value]) => [value, k])); // the plugin keeps the inner blocks' patch ids
    return loaded.commands.map((command) => ({
      ...command,
      stage: id,
      ...(command.type === CommandType.AddBlock && keyOf.has(command.id)
        ? { key: keyOf.get(command.id) }
        : {}),
    }));
  } catch (error) {
    console.warn('BlokDust: a Stage block could not be filled', error);
    return [];
  }
}

/** Build Stage block `id`'s inner world from its macro, then give its samplers their audio (and the Microphone its input). */
export function buildStage(id: number, uid: string): void {
  sendRaw(stageCommands(id, uid));
  void fillStageSamples(id, uid);
  syncMacros();
}

/** Audio for the samplers inside Stage block `id`: what was loaded already, else from their references (a sound, a
 * remembered file, a SampleGen's recipe). Runs from outside; looking in shows the same audio (enterStage). */
export async function fillStageSamples(id: number, uid: string): Promise<void> {
  const macro = macros.get(uid),
    ids = innerIds.get(uid)?.ids;
  if (juce || !engine || !macro || !ids) return;
  const build = (stageBuilds.get(uid) ?? 0) + 1;
  stageBuilds.set(uid, build);
  const audio = innerSamples.get(uid) ?? new Map<string, AudioBuffer>();
  innerSamples.set(uid, audio);
  if (macro.blocks.some((b) => needsInput(b.type))) listen();
  await Promise.all(
    macro.blocks.map(async (blk) => {
      const iid = blk.id === undefined ? undefined : ids[blk.id];
      if (iid === undefined || blk.id === undefined) return;
      const buf =
        audio.get(blk.id) ??
        (await innerBuffer(blk).catch((error) => {
          console.warn('BlokDust: a sampler inside a Stage has no audio', error);
          return null;
        }));
      if (!buf || stageBuilds.get(uid) !== build) return; // the Stage was built again meanwhile
      audio.set(blk.id, buf);
      engine?.sendSample(iid, buf, id);
    }),
  );
}

/** A sampler's audio from what the patch says of it, without it being on show. */
export async function innerBuffer(blk: PatchBlock): Promise<AudioBuffer | null> {
  const p = (blk.params ??= {});
  if (blk.type === 'source.sample-gen') return generateBuffer(p);
  if (!SAMPLERS.has(blk.type)) return null;
  const t =
    p.track ?? BLOCKS_BY_ID.get(blk.type)?.params.find((param) => param.key === 'track')?.default;
  let bytes: ArrayBuffer | null = null;
  if (isDeadDefault(t)) {
    const d = DEFAULT_SOUNDS[blk.type];
    if (!d) return null;
    const ref = { ...d };
    bytes = await fetchFreesound(ref, blk.type === 'fx.convolver' ? 2.5 : undefined);
    const key = refKey(ref);
    refs.set(key, ref);
    Object.assign(p, {
      track: key,
      trackName: ref.name.toUpperCase().slice(0, 30),
      user: ref.username,
      permalink: ref.url,
    });
  } else if (typeof t === 'string') {
    const ref = refs.get(t);
    if (t.startsWith('freesound:') && ref?.provider === 'freesound')
      bytes = await fetchFreesound(ref, blk.type === 'fx.convolver' ? 2.5 : undefined);
    else if (t.startsWith('file:') && ref?.provider === 'file' && ref.hash)
      bytes = (await (await openRemembered(ref.hash, false))?.arrayBuffer()) ?? null;
  }
  return bytes ? new OfflineAudioContext(1, 1, 48000).decodeAudioData(bytes) : null;
}

export function setInside<Value extends typeof inside>(value: Value): Value {
  inside = value;
  return value;
}

export function setSentMacros<Value extends typeof sentMacros>(value: Value): Value {
  sentMacros = value;
  return value;
}
