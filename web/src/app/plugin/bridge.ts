// Messages from the plugin's processor, and what the page tells it back.
import { appKey, setAppKey } from '../../account/appKey.ts';
import * as account from '../../account/client.ts';
import { CommandType } from '../../engine/wasmEngine.ts';
import type { OptionHandle } from '../../v1ui/ported/UI/Options/OptionHandle';
import { nativeAnswer, setNativeAnswer } from '../account/nativeSignIn.ts';
import {
  refreshOwnership,
  setPluginBrowser,
  setPluginName,
  setPluginNative,
} from '../account/pluginAccount.ts';
import { addBlock } from '../blocks/addBlock.ts';
import { juce, values } from '../boot/page.ts';
import { app, stage } from '../boot/pixi.ts';
import { onSnapshot, overlay } from '../engine/snapshots.ts';
import { atStage, sendRaw, setSendRaw } from '../model/engineLink.ts';
import { ccBySlot, model, v1Blocks } from '../model/patchModel.ts';
import { inside } from '../model/stageWorlds.ts';
import { SAMPLERS } from '../samples/userSamples.ts';
import { accountSettings } from '../scene/hostParts.ts';
import { scene } from '../scene/scene.ts';
import { onPatchArrived, type PatchMessage } from './patchArrival.ts';
import { applyPluginSample, type PluginSampleInfo } from './pluginSamples.ts';

interface ParamValuesMessage {
  values: { id: number; param: string; value: number }[];
}
interface AccountMessage {
  key?: string;
  name?: string;
  browser?: boolean;
  native?: boolean;
}
interface SnapshotMessage {
  view?: number;
  particles: number[];
  connections: number[];
  powered: number[];
  beams?: number[];
  playheads?: number[];
  monitors?: number[];
}

const STATS_EVERY_MS = 5000;

/** v1 marks a slider or handle Selected while the mouse holds it. */
function userIsDraggingAnOption(): boolean {
  return scene.OptionsPanel.Options.some(
    (option) =>
      (option.Type === 'slider' && option.Selected) ||
      (option.Handles as OptionHandle[] | undefined)?.some((handle) => handle.Selected) === true,
  );
}

/** Dust moves (host automation, MIDI CC): the block takes the value; its open panel shows it. */
function onParamValues(message: ParamValuesMessage): void {
  const openBlock = scene.OptionsPanel.Scale > 0 ? scene.OptionsPanel.SelectedBlock : null;
  // Dust moves the outer world's blocks, even while a Stage is open.
  const blocks = inside ? inside.outer.model : model;
  const panelBlocks = inside ? inside.outer.v1Blocks : v1Blocks;
  let refresh = false;
  for (const { id, param, value } of message.values) {
    const block = blocks.get(id);
    const v1Block = panelBlocks.get(id);
    if (!block || !v1Block) continue;
    block.params[param] = value;
    v1Block.Params[param] = value;
    if (openBlock === v1Block) refresh = true;
  }
  if (refresh && openBlock && !userIsDraggingAnOption()) openBlock.RefreshOptionsPanel();
}

/** Signed in (SHARING-0011): the key the plugin keeps, its name, whether it can open a browser. */
function onAccount(message: AccountMessage): void {
  setAppKey(message.key ?? null);
  if (message.name) setPluginName(message.name);
  setPluginBrowser(message.browser !== false);
  setPluginNative(!!message.native);
  if (appKey())
    void account
      .accountPatches()
      .then(() => {
        refreshOwnership();
      })
      .catch(() => {});
  void accountSettings().accountPage?.refresh(false);
}

/** A file dropped on the editor (CHG-0004 3.7): the sampler under it, or a new Sample there. */
function onDropAt(drop: { x: number; y: number; token: number }): void {
  const canvasBox = app.canvas.getBoundingClientRect();
  const x = drop.x - canvasBox.left;
  const y = drop.y - canvasBox.top;
  const hit = stage.hitTest(x, y);
  let id = hit && SAMPLERS.has(hit.type) ? hit.id : null;
  if (id === null) {
    const [gridX, gridY] = stage.cssToGrid(x, y);
    id = addBlock('source.sample', Math.round(gridX), Math.round(gridY), {});
  }
  juce?.emitEvent('bd_dropTarget', { token: drop.token, id, ...atStage() });
}

let snapshotsSinceStats = 0;

function onSnapshotMessage(message: SnapshotMessage): void {
  if ((message.view ?? 0) !== (inside?.stageId ?? 0)) return;
  snapshotsSinceStats++;
  onSnapshot({
    type: 'snapshot',
    frame: 0,
    rms: 0,
    events: [],
    particles: new Float32Array(message.particles),
    connections: new Uint32Array(message.connections),
    powered: new Uint32Array(message.powered),
    beams: new Float32Array(message.beams ?? []),
    playheads: new Float32Array(message.playheads ?? []),
    monitors: new Float32Array(message.monitors ?? []),
  });
}

/** Frame and snapshot rates for the plugin's log, every 5 s (an iPad has no devtools; CHG-0025). */
function reportRates(): void {
  let frames = 0;
  let since = performance.now();
  const countFrame = (now: number) => {
    frames++;
    if (now - since >= STATS_EVERY_MS) {
      const seconds = (now - since) / 1000;
      juce?.emitEvent('bd_stats', {
        fps: Math.round(frames / seconds),
        snapshots: Math.round(snapshotsSinceStats / seconds),
        w: innerWidth,
        h: innerHeight,
        dpr: devicePixelRatio,
      });
      frames = 0;
      snapshotsSinceStats = 0;
      since = now;
    }
    requestAnimationFrame(countFrame);
  };
  requestAnimationFrame(countFrame);
}

export function init(): void {
  if (!juce) return;
  overlay.remove();
  setSendRaw((commands) => juce?.emitEvent('bd_commands', { commands }));
  juce.addEventListener('bd_patch', (message: PatchMessage) => {
    onPatchArrived(message);
  });
  juce.addEventListener('bd_paramValues', onParamValues);
  juce.addEventListener('bd_hostState', (host: { mode: number; playing: boolean }) => {
    scene.setHostState(host.mode, host.playing);
    stage.redraw();
  });
  juce.addEventListener('bd_ccLearned', (learned: { slot: number; cc: number }) => {
    ccBySlot.set(learned.slot, learned.cc);
  });
  for (const nativeDone of ['bd_nativeAppleDone', 'bd_nativePasskeyDone'])
    juce.addEventListener(nativeDone, (answer: Record<string, string | boolean>) => {
      const waiting = nativeAnswer;
      setNativeAnswer(null);
      waiting?.(answer);
    });
  juce.addEventListener('bd_account', onAccount);
  // Plugin samples (CHG-0004 3.6): the processor loads them natively and reports what to show.
  juce.addEventListener('bd_sampleInfo', (info: PluginSampleInfo) => {
    applyPluginSample(info);
  });
  juce.addEventListener('bd_dropAt', onDropAt);
  reportRates();
  juce.addEventListener('bd_snapshot', onSnapshotMessage);
  juce.emitEvent('bd_hello', {});
  values?.ask();
  juce.emitEvent('bd_samplesHello', {});
  sendRaw([{ type: CommandType.WorldPower, id: 0, value: 1 }]); // a reopened editor shows it on
}
