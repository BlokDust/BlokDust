// Messages from the plugin's processor.
import { App } from '../../v1ui/shim.ts';
import { hideLinks } from '../../v1ui/scene.ts';
import { COPY as PATCH_COPY } from '../../v1ui/patches.ts';
import { type Patch } from '../../patch/loadPatch.ts';
import { apiUrl } from '../../patch/site.ts';
import { V1Block } from '../../v1ui/blocks.ts';
import { setAppKey, appKey } from '../../account/appKey.ts';
import * as account from '../../account/client.ts';
import { CommandType } from '../../engine/wasmEngine.ts';
import {
  nativeAnswer,
  refreshOwnership,
  setNativeAnswer,
  setPluginBrowser,
  setPluginName,
  setPluginNative,
} from '../account/pluginAccount.ts';
import { addBlock } from '../blocks/addBlock.ts';
import { juce, values } from '../boot/page.ts';
import { app, stage } from '../boot/pixi.ts';
import { startPlacing } from '../editing/placing.ts';
import { onSnapshot, overlay } from '../engine/snapshots.ts';
import {
  atStage,
  ios,
  sendRaw,
  setIos,
  setSendRaw,
  setStandalone,
  standalone,
} from '../model/engineLink.ts';
import { automation, ccBySlot, model, toPatch, v1Blocks } from '../model/patchModel.ts';
import { innerIds, inside, setSentMacros } from '../model/stageWorlds.ts';
import { setBaseline } from '../model/unsavedChanges.ts';
import { pluginAfterLoad, setPluginAfterLoad } from '../patchFiles/applyPatch.ts';
import { showPatch } from '../patchFiles/showPatch.ts';
import { type PluginSampleInfo, applyPluginSample } from './pluginSamples.ts';
import { SAMPLERS } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';
import { hostSystem } from '../support/feedback.ts';
import { probe } from '../testing/probe.ts';

export function init(): void {
  if (juce) {
    overlay.remove();
    setSendRaw((cmds) => juce?.emitEvent('bd_commands', { commands: cmds }));
    juce.addEventListener(
      'bd_patch',
      (e: {
        patch: string;
        ids?: Record<string, number>;
        innerIds?: Record<string, Record<string, number>>;
        standalone?: boolean;
        ios?: boolean;
        powerMode?: number;
        hostPlaying?: boolean;
      }) => {
        setStandalone(!!e.standalone);
        setIos(!!e.ios);
        // DAW plugins: the power switch's HOST cell (a standalone app has no transport; CHG-0025).
        scene.hostPower = !standalone;
        scene.setHostState(e.powerMode ?? 1, !!e.hostPlaying);
        if (ios && !standalone && !App.NoLinks) hideLinks(); // an iPad extension can't open Safari (CHG-0025)
        if (ios)
          PATCH_COPY.shareLinePlugin =
            'Send a link to this patch from the share menu: Messages, WhatsApp, Mail and more.';
        const p = JSON.parse(e.patch) as Patch & {
          automation?: { slot: number; block: string; param: string; cc?: number }[];
        };
        showPatch(p, e.ids);
        // The engine ids of the blocks inside each Stage (CHG-0038): a reopened editor edits the blocks the processor has.
        for (const [uid, ids] of Object.entries(e.innerIds ?? {}))
          innerIds.set(uid, { ids, nextId: Math.max(0, ...Object.values(ids)) + 1 });
        setSentMacros(JSON.stringify(toPatch().macros ?? []));
        const after = pluginAfterLoad;
        setPluginAfterLoad(null);
        if (after && 'open' in after) setBaseline();
        else if (after)
          startPlacing(
            [...model].filter(([, b]) => after.place.has(b.uid)).map(([id]) => id),
            after.touch,
            after.at,
          );
        automation.clear();
        ccBySlot.clear();
        for (const a of p.automation ?? []) {
          for (const [id, b] of model)
            if (b.uid === a.block) automation.set(`${id}:${a.param}`, a.slot);
          if (typeof a.cc === 'number') ccBySlot.set(a.slot, a.cc);
        }
        probe.started = true;
        // events: where the plugin sends its daily usage ping (SHARING-0010 R8), the same server this page uses.
        juce?.emitEvent('bd_ready', {
          blocks: stage.allBlocks().length,
          supportSystem: hostSystem,
          events: apiUrl('events'),
        });
      },
    );
    // Plugin samples (CHG-0004 3.6): the processor loads them natively and reports what to show.
    // Dust moves (host automation, MIDI CC; owner, Ableton, 2026-11-12): the block takes the value, and its options
    // panel, if open, shows it at once. The engine has it already (the processor set it).
    juce.addEventListener(
      'bd_paramValues',
      (e: { values: { id: number; param: string; value: number }[] }) => {
        const open = scene.OptionsPanel.Scale > 0 ? scene.OptionsPanel.SelectedBlock : null;
        let refresh = false;
        const mdl = inside ? inside.outer.model : model,
          v1s = inside ? inside.outer.v1Blocks : v1Blocks; // Dust moves outer blocks
        for (const u of e.values ?? []) {
          const m = mdl.get(u.id),
            b = v1s.get(u.id);
          if (!m || !b) continue;
          m.params[u.param] = u.value;
          b.Params[u.param] = u.value;
          if (open === b) refresh = true;
        }
        // Not while the user is dragging one of its sliders or handles (v1 marks them Selected until mouse up).
        const dragging = ((scene.OptionsPanel as any).Options ?? []).some(
          (o: any) =>
            (o.Type === 'slider' && o.Selected) || o.Handles?.some((h: any) => h.Selected),
        );
        if (refresh && !dragging) (open as V1Block).RefreshOptionsPanel();
      },
    );
    juce.addEventListener('bd_hostState', (h: { mode: number; playing: boolean }) => {
      scene.setHostState(h.mode, h.playing);
      stage.redraw();
    });
    juce.addEventListener('bd_ccLearned', (e: { slot: number; cc: number }) => {
      ccBySlot.set(e.slot, e.cc);
    });
    for (const ev of ['bd_nativeAppleDone', 'bd_nativePasskeyDone'])
      juce.addEventListener(ev, (v: Record<string, string | boolean>) => {
        const f = nativeAnswer;
        setNativeAnswer(null);
        f?.(v);
      });
    // Signed in (SHARING-0011): the key the plugin keeps; what it calls itself; whether it can open a browser.
    juce.addEventListener(
      'bd_account',
      (e: { key?: string; name?: string; browser?: boolean; native?: boolean }) => {
        setAppKey(e.key ?? null);
        if (e.name) setPluginName(e.name);
        setPluginBrowser(e.browser !== false);
        setPluginNative(!!e.native);
        if (appKey())
          void account
            .accountPatches()
            .then(() => refreshOwnership())
            .catch(() => {});
        void (scene.SettingsPanel as any).accountPage?.refresh(false);
      },
    );
    juce.addEventListener('bd_sampleInfo', (s: PluginSampleInfo) => applyPluginSample(s));
    // A file dropped on the plugin editor (CHG-0004 3.7): which sampler is under it, or a new Sample there.
    juce.addEventListener('bd_dropAt', (d: { x: number; y: number; token: number }) => {
      const r = app.canvas.getBoundingClientRect(),
        x = d.x - r.left,
        y = d.y - r.top;
      const hit = stage.hitTest(x, y);
      let id = hit && SAMPLERS.has(hit.type) ? hit.id : null;
      if (id === null) {
        const [gx, gy] = stage.cssToGrid(x, y);
        id = addBlock('source.sample', Math.round(gx), Math.round(gy), {});
      }
      juce?.emitEvent('bd_dropTarget', { token: d.token, id, ...atStage() });
    });
    // Frame and snapshot rates, every 5 s, for the plugin's log (an iPad has no devtools; CHG-0025).
    let frames = 0,
      snaps = 0,
      since = performance.now();
    const count = (now: number) => {
      ++frames;
      if (now - since >= 5000) {
        const s = (now - since) / 1000;
        juce?.emitEvent('bd_stats', {
          fps: Math.round(frames / s),
          snapshots: Math.round(snaps / s),
          w: innerWidth,
          h: innerHeight,
          dpr: devicePixelRatio,
        });
        frames = 0;
        snaps = 0;
        since = now;
      }
      requestAnimationFrame(count);
    };
    requestAnimationFrame(count);
    juce.addEventListener(
      'bd_snapshot',
      (e: {
        view?: number;
        particles: number[];
        connections: number[];
        powered: number[];
        beams: number[];
        playheads?: number[];
        monitors?: number[];
      }) =>
        (e.view ?? 0) !== (inside?.stageId ?? 0)
          ? undefined
          : (++snaps,
            onSnapshot({
              type: 'snapshot',
              frame: 0,
              rms: 0,
              events: [],
              particles: new Float32Array(e.particles),
              connections: new Uint32Array(e.connections),
              powered: new Uint32Array(e.powered),
              beams: new Float32Array(e.beams ?? []),
              playheads: new Float32Array(e.playheads ?? []),
              monitors: new Float32Array(e.monitors ?? []),
            })),
    );
    juce.emitEvent('bd_hello', {});
    values?.ask();
    juce.emitEvent('bd_samplesHello', {});
    sendRaw([{ type: CommandType.WorldPower, id: 0, value: 1 }]); // a reopened editor shows the switch on: so is the world
  }
}
