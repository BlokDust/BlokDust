// Engine snapshots: what the stage draws, and the patch state they change.
import { toPatch } from '../model/toPatch.ts';
import { saveLocal } from '../../patch/share.ts';
import { type Snapshot } from '../../audio/protocol.ts';
import { activity } from '../../account/activity.ts';
import { setMonitors, openGateIds } from '../../v1ui/newBlocks.ts';
import { setLastSnapshot } from '../audio/keepAwake.ts';
import { embedId, juce } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { autosaveIsThis } from '../model/autosave.ts';
import {
  connectionOrder,
  countActivity,
  model,
  setConnectionOrder,
  tempo,
  v1Blocks,
} from '../model/patchModel.ts';
import { scene } from '../scene/scene.ts';
import { probe } from '../testing/probe.ts';

export let overlay!: HTMLElement;

/** A Toggle the engine switched (a particle or laser hit): the patch keeps its state, as v1's Toggle did (its
 * Params.logic), so a save, a share link or the autosave reopens with the Toggles as they were (owner, 2026-11-13). */
export function logicFlipped(id: number, on: boolean): void {
  const b = model.get(id),
    v1Block = v1Blocks.get(id);
  if (b?.type !== 'power.toggle' || !!b.params.logic === on) return;
  b.params.logic = on;
  if (v1Block) {
    v1Block.Params.logic = on;
    if (scene.OptionsPanel.Scale > 0 && scene.OptionsPanel.SelectedBlock === v1Block)
      v1Block.RefreshOptionsPanel();
  }
  // Not an edit: the autosave (when it holds this patch) catches up within a second, without marking it unsaved or
  // putting off the save of a real edit (a running scene may flip Toggles faster than the edit debounce).
  if (embedId || juce || !autosaveIsThis || logicSave) return;
  logicSave = setTimeout(() => {
    logicSave = undefined;
    saveLocal(toPatch());
  }, 1000);
}

export let logicSave: ReturnType<typeof setTimeout> | undefined;

export const onSnapshot = (snapshot: Snapshot) => {
  probe.snapshots++;
  setLastSnapshot(performance.now());
  probe.rms = snapshot.rms;
  probe.particles = snapshot.particles.length / 3;
  probe.beams = snapshot.beams.length / 4;
  // v1 Settings › dB Meter (Tone.Meter on the master output, smoothed 0.8): level in dB from the snapshot RMS.
  scene.setLevelDb(20 * Math.log10(Math.max(snapshot.rms, 1e-5)));
  for (const engineEvent of snapshot.events) {
    if (engineEvent.type === 4) probe.gateOns++;
    if (engineEvent.type === 1) probe.hits++;
    if (engineEvent.type === 8 && engineEvent.value !== undefined)
      logicFlipped(engineEvent.block, engineEvent.value !== 0);
  }
  if (snapshot.connections) {
    stage.setConnections(snapshot.connections);
    probe.connections = Array.from(snapshot.connections);
    const order: [string, string][] = [];
    let known = true; // a snapshot from before the blocks are shown (the plugin's first) says nothing about order
    for (let i = 0; i + 1 < snapshot.connections.length; i += 2) {
      const a = model.get(snapshot.connections[i])?.uid,
        b = model.get(snapshot.connections[i + 1])?.uid;
      if (a && b) order.push([a, b]);
      else known = false;
    }
    if (known) {
      const was = JSON.stringify(connectionOrder);
      setConnectionOrder(order);
      // Plugin: the processor keeps the host's copy of the patch (getStateInformation).
      if (juce && JSON.stringify(order) !== was) juce.emitEvent('bd_connectionOrder', { order });
    }
  }
  stage.setPowered(snapshot.powered);
  probe.powered = Array.from(snapshot.powered);
  if (countActivity)
    activity.frame(performance.now(), {
      blocks: model,
      powered: new Set(snapshot.powered),
      worldOn: scene.worldPower,
      tempo: tempo ?? 120,
      visible: document.visibilityState === 'visible',
      emitted: snapshot.emitted ?? 0,
    });
  stage.setBeams(snapshot.beams);
  stage.setParticles(snapshot.particles);
  scene.setPlayheads(snapshot.playheads ?? new Float32Array(0));
  setMonitors(snapshot.monitors ?? new Float32Array(0));
  stage.setOpenGates(openGateIds(snapshot.monitors ?? new Float32Array(0)));
};

export function init(): void {
  overlay = document.getElementById('start')!;
}
