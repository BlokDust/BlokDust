// window.__bd_probe: what the browser tests read and drive.
import { hideLinks } from '../../v1ui/scene.ts';
import { drawBlocks } from '../../stage/drawWorld.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { labelRect } from '../../stage/labels.ts';
import { App } from '../../v1ui/shim.ts';
import { WasmEngine, hex, hashStereo, hashAudio } from '../../engine/wasmEngine.ts';
import { engineModule } from '../../audio/engineNode.ts';
import { type ButtonBox } from '../../stage/makeStageButton.ts';
import { activity } from '../../account/activity.ts';
import { guarded } from '../audio/microphone.ts';
import { stage } from '../boot/pixi.ts';
import { idOfUid } from '../editing/undoSteps.ts';
import { engineCommands } from '../engine/engineCommands.ts';
import { setSelection } from '../input/selection.ts';
import { measure } from '../labels/labels.ts';
import { engine } from '../model/engineLink.ts';
import { labels, model, seed, toPatch } from '../model/patchModel.ts';
import { innerIds, innerSamples, inside } from '../model/stageWorlds.ts';
import { shareLink } from '../model/unsavedChanges.ts';
import { samples } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';
import { ownDirty, ownLink, quickSaving } from '../share/ownLink.ts';
import { accountPage, cornerBoxes, credit, saveHover } from '../stage/corners.ts';
import { makeStageAt } from '../stage/makeStage.ts';
import { insideFrame } from '../stageBlock/lookInside.ts';

export const probe = {
  started: false,
  snapshots: 0,
  rms: 0,
  particles: 0,
  connections: [] as number[],
  gateOns: 0,
  hits: 0,
  beams: 0,
  powered: [] as number[],
};

export function init(): void {
  (window as unknown as { __bd_probe: unknown }).__bd_probe = {
    hideLinks, // tests: the iPad extension's no-links view (CHG-0025)
    /** Tests: the stage's block drawing and the manifests (block-edges-clean). */
    blockDrawing: { drawBlocks, BLOCKS_BY_ID },
    /** The microphone is asked for or open (tests, CHG-0035). */
    get microphoneOpen() {
      return !!engine?.microphoneOpen;
    },
    /** Someone else's patch (CHG-0041): the page's flag, and whether the safety limit is on the output (tests). */
    get guarded() {
      return { page: guarded, limit: !!engine?.guarded };
    },
    get state() {
      return { ...probe, blocks: stage.allBlocks(), patch: toPatch() };
    },
    /** The Stage being looked into and its window, in css px (tests); null on the outer stage. */
    get inside() {
      if (!inside) return null;
      const f = insideFrame(),
        d = stage.metrics.dpr;
      return {
        stage: inside.stageId,
        x: f.x / d,
        y: f.y / d,
        w: f.w / d,
        h: f.h / d,
        closeX: f.closeX / d,
        closeY: f.closeY / d,
      };
    },
    /** The engine id of the block saved as `uid` in the world on show (tests). */
    idOf(uid: string) {
      return idOfUid(uid);
    },
    /** Labels on the stage (CHG-0020) and where each is, in css px (tests). */
    get labels() {
      const m = stage.metrics;
      return labels.map((label) => {
        const r = labelRect(measure, m, label);
        return { ...label, cx: (r.x + r.w / 2) / m.dpr, cy: (r.y + r.h / 2) / m.dpr };
      });
    },
    /** Laser beams drawn now (a beam through a Prism is several, CHG-0015). */
    get beams() {
      return probe.beams;
    },
    /** The Stage block a drag would go into now (tests). */
    get dropTarget() {
      return stage.dropTarget;
    },
    /** The MAKE STAGE button's centre in css px, or null when it is not offered (tests). */
    get makeStage() {
      if (!makeStageAt) return null;
      const d = stage.metrics.dpr,
        b = makeStageAt;
      return {
        x: (b.x + b.w / 2) / d,
        y: (b.y + b.h / 2) / d,
        box: { x: b.x / d, y: b.y / d, w: b.w / d, h: b.h / d },
      };
    },
    /** The selected blocks' rings together, css px (tests). */
    get selectedBounds() {
      const b = stage.selectedBounds(),
        d = stage.metrics.dpr;
      return b && { x0: b.x0 / d, y0: b.y0 / d, x1: b.x1 / d, y1: b.y1 / d };
    },
    /** Select blocks by engine id, as shift-clicks would (tests). */
    select(ids: number[]) {
      setSelection(ids);
      stage.redraw();
    },
    /** css px of a point on block `id` that the stage's own hit test maps to it (black-box tests click there). */
    blockPoint(id: number): [number, number] | null {
      const b = stage.block(id);
      if (!b) return null;
      const m = stage.metrics,
        cx = (m.originX + b.x * m.scaledGridSize) / m.dpr,
        cy = (m.originY + b.y * m.scaledGridSize) / m.dpr,
        g = m.scaledGridSize / m.dpr;
      for (let r = 0; r <= 2.5; r += 0.25)
        for (let a = 0; a < 8; a++) {
          const x = cx + Math.cos((a * Math.PI) / 4) * r * g,
            y = cy + Math.sin((a * Math.PI) / 4) * r * g;
          if (stage.hitTest(x, y)?.id === id) return [x, y];
        }
      return null;
    },
    /** The stage grid point under css (x, y). */
    cssToGrid(x: number, y: number) {
      return stage.cssToGrid(x, y);
    },
    /** css px of a grid point (for black-box tests driving the real pointer). */
    toCss(gx: number, gy: number) {
      const m = stage.metrics;
      return [
        (m.originX + gx * m.scaledGridSize) / m.dpr,
        (m.originY + gy * m.scaledGridSize) / m.dpr,
      ];
    },
    /** The v1 UI scene (state captures and tests) and v1's App globals (units, sizes, composition ids). */
    scene,
    v1App: App,
    /** Offline render of the patch as loaded here (model + attached samples) with the WASM engine on the main thread:
     * same patch + same samples → same hash, in any browser session (CHG-0003 acceptance: share → identical render). */
    async renderHash(seconds = 4, sampleRate = 48000) {
      const engine = WasmEngine.fromModule(await engineModule(), sampleRate, seed);
      try {
        for (const command of engineCommands()) engine.push(command);
        const frames = Math.round(seconds * sampleRate),
          l = new Float32Array(frames),
          r = new Float32Array(frames);
        for (let at = 0; at < frames; at += 128) {
          const out = engine.process(Math.min(128, frames - at));
          l.set(out.left, at);
          r.set(out.right, at);
          // Blocks exist after the first quantum (commands apply at its first tick); samples attach then, as in the
          // live worklet where they arrive after start. Fixed point → same hash everywhere.
          if (at === 0)
            for (const [id, buf] of samples)
              if (model.has(id))
                engine.attachSample(
                  id,
                  buf.getChannelData(0),
                  buf.numberOfChannels > 1 ? buf.getChannelData(1) : undefined,
                  buf.sampleRate,
                );
          if (at === 0)
            for (const [id, b] of model)
              if (b.type === 'source.stage')
                // and inside its Stage blocks
                for (const [uid, buf] of innerSamples.get(b.uid) ?? []) {
                  const iid = innerIds.get(b.uid)?.ids[uid];
                  if (iid !== undefined)
                    engine.attachSample(
                      iid,
                      buf.getChannelData(0),
                      buf.numberOfChannels > 1 ? buf.getChannelData(1) : undefined,
                      buf.sampleRate,
                      id,
                    );
                }
        }
        let peak = 0;
        for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
        return { hash: hex(hashStereo(hashAudio(l), hashAudio(r))), peak };
      } finally {
        engine.dispose();
      }
    },
    /** The stage's corners (tests): a patch's credit and who is signed in, with their centres in css px. */
    get corners() {
      const d = stage.metrics.dpr,
        c = (b?: ButtonBox) => (b ? [(b.x + b.w / 2) / d, (b.y + b.h / 2) / d] : null);
      // creditAt: the title's start, clear of the @NAME link and the star.
      const titleAt = cornerBoxes.credit
        ? [
            (cornerBoxes.credit.x + 12 * stage.metrics.unit) / d,
            (cornerBoxes.credit.y + cornerBoxes.credit.h / 2) / d,
          ]
        : null;
      return {
        credit,
        me: accountPage()?.Account?.handle ?? null,
        byAt: c(cornerBoxes.by),
        meAt: c(cornerBoxes.me),
        meBox: cornerBoxes.me && {
          x: cornerBoxes.me.x / d,
          y: cornerBoxes.me.y / d,
          w: cornerBoxes.me.w / d,
          h: cornerBoxes.me.h / d,
        },
        likeAt: c(cornerBoxes.like),
        creditAt: titleAt,
        // Quick save (CHG-0033): the own patch's line and where its UNSAVED / SAVE word is.
        own: ownLink()
          ? { title: shareLink!.title, dirty: ownDirty, saving: quickSaving, hover: saveHover }
          : null,
        saveAt: c(cornerBoxes.save),
      };
    },
    /** Sample state per block (tests): loaded, or missing with its reference. */
    /** The account's running totals not yet sent (SPEC-SHARING-ACCOUNTS R16; tests). */
    get activity() {
      return activity.pending();
    },
    get samples() {
      return [...model]
        .filter(([, b]) => BLOCKS_BY_ID.get(b.type)?.params.some((param) => param.key === 'track'))
        .map(([id, b]) => ({
          id,
          uid: b.uid,
          type: b.type,
          track: b.params.track,
          loaded: samples.has(id),
          frames: samples.get(id)?.length ?? 0,
        }));
    },
  };
}
