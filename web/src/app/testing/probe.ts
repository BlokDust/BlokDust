// window.__bd_probe: what the browser tests read and drive (tests import its type).
import { toPatch } from '../model/toPatch.ts';
import { activity } from '../../account/activity.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { drawBlocks } from '../../stage/drawWorld.ts';
import { hideLinks } from '../../v1ui/scene.ts';
import { App } from '../../v1ui/shim.ts';
import { guarded } from '../audio/microphone.ts';
import { stage } from '../boot/pixi.ts';
import { idOfUid } from '../editing/undoSteps.ts';
import { setSelection } from '../input/selection.ts';
import { engine } from '../model/engineLink.ts';
import { model } from '../model/patchModel.ts';
import { samples } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';
import {
  blockPoint,
  cornersView,
  gridToCss,
  insideView,
  labelsView,
  makeStageView,
  selectedBoundsView,
} from './probeView.ts';
import { renderHash } from './renderHash.ts';

/** Counters the engine's snapshots keep current. */
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

function samplerStates() {
  return [...model]
    .filter(([, block]) =>
      BLOCKS_BY_ID.get(block.type)?.params.some((param) => param.key === 'track'),
    )
    .map(([id, block]) => ({
      id,
      uid: block.uid,
      type: block.type,
      track: block.params.track,
      loaded: samples.has(id),
      frames: samples.get(id)?.length ?? 0,
    }));
}

function createProbe() {
  return {
    hideLinks, // the iPad extension's no-links view (CHG-0025)
    blockDrawing: { drawBlocks, BLOCKS_BY_ID },
    get microphoneOpen() {
      return !!engine?.microphoneOpen;
    },
    /** Someone else's patch (CHG-0041): the page's flag, and the output's safety limit. */
    get guarded() {
      return { page: guarded, limit: !!engine?.guarded };
    },
    get state() {
      return { ...probe, blocks: stage.allBlocks(), patch: toPatch() };
    },
    get inside() {
      return insideView();
    },
    idOf: (uid: string) => idOfUid(uid),
    get labels() {
      return labelsView();
    },
    /** Laser beams drawn now (a beam through a Prism is several, CHG-0015). */
    get beams() {
      return probe.beams;
    },
    get dropTarget() {
      return stage.dropTarget;
    },
    get makeStage() {
      return makeStageView();
    },
    get selectedBounds() {
      return selectedBoundsView();
    },
    /** Select blocks by engine id, as shift-clicks would. */
    select: (ids: number[]) => {
      setSelection(ids);
      stage.redraw();
    },
    blockPoint,
    cssToGrid: (x: number, y: number) => stage.cssToGrid(x, y),
    toCss: gridToCss,
    scene,
    v1App: App,
    renderHash,
    get corners() {
      return cornersView();
    },
    /** The account's running totals not yet sent (SPEC-SHARING-ACCOUNTS R16). */
    get activity() {
      return activity.pending();
    },
    get samples() {
      return samplerStates();
    },
  };
}

export type BdProbe = ReturnType<typeof createProbe>;

declare global {
  interface Window {
    __bd_probe?: BdProbe;
  }
}

export function init(): void {
  window.__bd_probe = createProbe();
}
